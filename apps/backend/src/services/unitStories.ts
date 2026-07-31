import { createHash, randomUUID } from 'crypto';
import { getDb } from '../db/sqlite';
import { env } from '../config/env';
import { chatCompletion, isDemoLlm } from './llm';
import { scrubScriptLeak } from './personaVoice';
import { quantizePromptText } from './promptQuantize';
import {
  getUnit,
  getUnitPageSample,
  type TextbookUnit,
} from './textbookUnits';
import {
  getUnitStoryCharacters,
  getUnitCharacterContext,
  listUnitFileStories,
  resolveUnitStory,
} from './unitCharacterStore';
import { buildPersonaFromCharacter } from './personaBuilder';

export type UnitStory = {
  id: string;
  title: string;
  summary: string;
  excerpt: string;
  characters: StoryCharacter[];
};

export type StoryCharacter = {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar_emoji: string;
};

function sanitizeText(s: string): string {
  return quantizePromptText(s);
}

function parseJsonArray<T>(raw: string): T[] {
  // Prefer first complete array (models sometimes emit several arrays in a row)
  const chunks = raw.match(/\[[\s\S]*?\]/g) || [];
  for (const chunk of chunks) {
    try {
      const arr = JSON.parse(chunk);
      if (Array.isArray(arr) && arr.length > 0) return arr as T[];
    } catch {
      /* try next */
    }
  }
  try {
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start < 0 || end <= start) return [];
    const arr = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function parseJsonObject<T extends Record<string, unknown>>(raw: string): T | null {
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function unitCorpus(textbookId: string, unit: TextbookUnit): string {
  return getUnitPageSample(textbookId, unit, 8500);
}

/** Re-resolve story text from OCR so client excerpt cannot inject prompts. */
export function resolveStoryFromCorpus(
  textbookId: string,
  unit: TextbookUnit,
  title: string
): { title: string; summary: string; excerpt: string } | null {
  const corpus = unitCorpus(textbookId, unit);
  const cleaned = title.trim();
  if (cleaned.length < 2) return null;

  const loose = cleaned.replace(/[「」『』"'‘’?.!\s]/g, '');
  const idxCandidates: number[] = [];
  const direct = corpus.indexOf(cleaned);
  if (direct >= 0) idxCandidates.push(direct);

  const re = new RegExp(
    cleaned
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s*'),
    'i'
  );
  const m = re.exec(corpus);
  if (m) idxCandidates.push(m.index);

  if (loose.length >= 2) {
    const compact = corpus.replace(/\s+/g, '');
    const cidx = compact.indexOf(loose);
    if (cidx >= 0) {
      // map roughly back — fall back to searching first 2 chars of title
      const tip = cleaned.slice(0, Math.min(4, cleaned.length));
      const tipIdx = corpus.indexOf(tip);
      if (tipIdx >= 0) idxCandidates.push(tipIdx);
    }
  }

  const idx = idxCandidates.length ? Math.min(...idxCandidates) : -1;
  if (idx < 0) {
    // Title not in corpus — refuse to trust client-only text
    return null;
  }

  const window = corpus.slice(Math.max(0, idx - 80), idx + 1400);
  const excerpt = sanitizeText(window).slice(0, 700);
  if (excerpt.length < 40) return null;

  return {
    title: sanitizeText(cleaned).slice(0, 80),
    summary: `「${sanitizeText(cleaned)}」에 나오는 이야기입니다.`,
    excerpt,
  };
}

function resolveStory(
  textbookId: string,
  unit: TextbookUnit,
  title: string
): { title: string; summary: string; excerpt: string } | null {
  return (
    resolveUnitStory(textbookId, unit.id, title) ||
    resolveStoryFromCorpus(textbookId, unit, title)
  );
}

function mergeUnitStories(discovered: UnitStory[], fileStories: UnitStory[]): UnitStory[] {
  const byTitle = new Map<string, UnitStory>();
  for (const s of fileStories) {
    byTitle.set(normalizeStoryTitle(s.title), s);
  }
  for (const s of discovered) {
    const key = normalizeStoryTitle(s.title);
    const existing = byTitle.get(key);
    if (existing) {
      byTitle.set(key, {
        ...existing,
        excerpt: existing.excerpt || s.excerpt,
        summary: existing.summary || s.summary,
      });
    } else {
      byTitle.set(key, s);
    }
  }
  return [...byTitle.values()];
}

export async function listStoriesForUnit(input: {
  textbookId: string;
  unitId: string;
}): Promise<{ unit: TextbookUnit; stories: UnitStory[]; preview: string }> {
  const unit = getUnit(input.textbookId, input.unitId);
  if (!unit) {
    throw Object.assign(new Error('Unit not found'), { status: 404 });
  }

  const corpus = unitCorpus(input.textbookId, unit);
  const book = getDb()
    .prepare(`SELECT title FROM textbooks WHERE id = ?`)
    .get(input.textbookId) as { title: string } | undefined;

  if (isDemoLlm(env) || corpus.length < 80) {
    const fileStories = listUnitFileStories(input.textbookId, input.unitId);
    return { unit, stories: fileStories, preview: corpus.slice(0, 600) };
  }

  const raw = await chatCompletion(env, {
    tier: 'medium',
    temperature: 0.2,
    maxTokens: 900,
    scrubSlop: false,
    humanLike: false,
    messages: [
      {
        role: 'system',
        content: 'Extract prose narrative works only (novel/fable/myth). No poetry or drills. JSON array only.',
      },
      {
        role: 'user',
        content: `교과: ${book?.title || '국어'} / ${unit.number ? `${unit.number}. ` : ''}${unit.title}

소설·동화·이야기·신화(산문)만 최대 4개. 시·연습대화·빈칸 제외.
각: {"title","summary","excerpt","kind":"소설|동화|이야기|신화"} 없으면 [].

${corpus.slice(0, 2800)}`,
      },
    ],
  });

  let parsed = parseJsonArray<{
    title?: string;
    summary?: string;
    excerpt?: string;
    kind?: string;
  }>(raw).map((s) => {
    const title = String(s.title || '').trim().slice(0, 80);
    let kind = String(s.kind || '').trim();
    if (/시/.test(kind) && /사랑이\s*뭔데요|알에서\s*태어나|주몽/.test(title)) {
      kind = /알에서|주몽/.test(title) ? '신화' : '이야기';
    }
    return {
      title,
      summary: String(s.summary || '').trim().slice(0, 200),
      excerpt: String(s.excerpt || '').trim().slice(0, 600),
      kind,
    };
  });

  parsed = parsed.filter((s) => isNarrativeFictionStory(s));
  if (parsed.length === 0) {
    parsed = heuristicStoryTitles(corpus);
  } else {
    const have = new Set(parsed.map((s) => normalizeStoryTitle(s.title)));
    for (const h of heuristicStoryTitles(corpus)) {
      const key = normalizeStoryTitle(h.title);
      if (!have.has(key)) {
        parsed.push(h);
        have.add(key);
      }
    }
  }

  const seen = new Set<string>();
  const stories: UnitStory[] = [];
  for (const s of parsed) {
    if (!isNarrativeFictionStory(s)) continue;
    const key = normalizeStoryTitle(s.title);
    if (!key || seen.has(key)) continue;

    // Ground every listed story in OCR text (drop hallucinated titles)
    const resolved = resolveStoryFromCorpus(input.textbookId, unit, s.title);
    if (!resolved) continue;

    seen.add(key);
    stories.push({
      id: randomUUID(),
      title: resolved.title,
      summary: sanitizeText(s.summary || resolved.summary).slice(0, 200),
      excerpt: resolved.excerpt,
      characters: getUnitStoryCharacters(input.textbookId, input.unitId, resolved.title),
    });
  }

  const fileStories = listUnitFileStories(input.textbookId, input.unitId);
  const merged = mergeUnitStories(stories, fileStories);

  return {
    unit,
    stories: merged.slice(0, 8),
    preview: corpus.slice(0, 600),
  };
}

function heuristicStoryTitles(corpus: string): Array<{
  title: string;
  summary: string;
  excerpt: string;
  kind: string;
}> {
  const found: Array<{
    title: string;
    summary: string;
    excerpt: string;
    kind: string;
  }> = [];
  const seen = new Set<string>();

  const push = (title: string, kind: string, idx: number) => {
    const t = title.trim().replace(/[?,.]$/, '');
    if (t.length < 2 || seen.has(t)) return;
    if (/물음|답해|정리|확인|낭송|쓰기|감상하기|비유적|풀잎과 바람|마음 저울|^딱지$|난 지금/.test(t)) {
      return;
    }
    const around = corpus.slice(Math.max(0, idx), idx + 1000);
    if (!/었[다어]|았[다어]|였다|이었다|했습니다/.test(around)) return;
    const excerpt = around.replace(/\s+/g, ' ').slice(0, 280).trim();
    if (excerpt.length < 40) return;
    seen.add(t);
    found.push({
      title: t,
      summary: `「${t}」에 나오는 이야기입니다.`,
      excerpt,
      kind,
    });
  };

  for (const [re, kind] of [
    [/사랑이\s*뭔데요\??/g, '이야기'],
    [/알에서\s*태어나다\.?/g, '신화'],
    [/책을\s*돌려주세요\.?/g, '이야기'],
    [/어부지리|아부지/g, '이야기'],
    [/진짜\s*행운/g, '이야기'],
    [/빨간\s*벽/g, '동화'],
    [/박혁거세\s*신화/g, '신화'],
    [/프로메테우스\s*신화/g, '신화'],
    [/지혜로운\s*이방의\s*아들/g, '이야기'],
    [/의병장\s*윤희순/g, '이야기'],
    [/책\s*짖는\s*소년|퍽\s*잦는\s*소년|책\s*깃는\s*소년/g, '소설'],
    [/다이빙대\s*위에서/g, '소설'],
    [/그랬다면\s*어땠을까/g, '이야기'],
  ] as Array<[RegExp, string]>) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(corpus)) !== null) {
      push(m[0].replace(/\.$/, ''), kind, m.index);
    }
  }

  const titleRe =
    /[「『]([^」』]{2,40})[」』]|['‘]([^'’]{2,40})['’]\s*[을를]?\s*읽어/g;
  let m: RegExpExecArray | null;
  while ((m = titleRe.exec(corpus)) !== null) {
    const title = (m[1] || m[2] || '').trim();
    const kind = /신화|주몽|알에서/.test(title) ? '신화' : '이야기';
    push(title, kind, m.index);
  }

  return found.slice(0, 4);
}

const POEM_TITLE_RE =
  /^(먹치|딱지|마음\s*저울|풀잎과\s*바람|난\s*지금\s*열두\s*살)$/;

function normalizeStoryTitle(title: string): string {
  return title
    .replace(/[「」『』"'‘’?.!\s]/g, '')
    .toLowerCase();
}

/** 단원 JSON → 등장인물 */
export function getStoryCharacters(
  textbookId: string,
  unitId: string,
  title: string
): StoryCharacter[] {
  return getUnitStoryCharacters(textbookId, unitId, title);
}

function isNarrativeFictionStory(s: {
  title: string;
  summary: string;
  excerpt: string;
  kind: string;
}): boolean {
  if (s.title.length < 2 || s.excerpt.length < 30) return false;
  if (POEM_TITLE_RE.test(s.title.trim())) return false;

  const blob = `${s.title}\n${s.summary}\n${s.excerpt}`;

  const drill =
    /대화\s*[0-9①②③④⑤⑥]|의\s*대화|대화\s*①|대화\s*②|해\s*봅시다|정리하기|확인하기|스스로\s*확인|학습\s*활동|말해\s*보|알아보|방법\s*알기|배워요|연습|토의해요|토론해요|검색하기|차례$|목차/;
  if (drill.test(blob)) return false;

  if (/^대화\s*[0-9①-⑨]?$/.test(s.title)) return false;
  if (/대화$/.test(s.title) && !/이야기|소설|동화|모험|여행/.test(s.title)) return false;

  if (/^시$|시\s*낭송|시\s*쓰기/.test(s.kind) || /시의\s*첫머리|시를\s*읽고/.test(blob)) {
    if (!/사랑이\s*뭔데요|알에서\s*태어나|주몽/.test(blob)) return false;
  }
  if (s.kind && !/소설|동화|이야기|신화|전설|서사|시/.test(s.kind)) return false;

  const narrativeCue =
    /었[다어]|았[다어]|였다|이었다|주인공|어느\s*날|그때|마을|숲|바다|학교\s*앞|꿈|떠났|만났|살았|가던|오고|로봇|박사/;
  const instructionCue = /다음을|빈칸|고르시오|쓰시오|읽어\s*봅시다|이야기해\s*봅시다/;
  if (instructionCue.test(blob) && !narrativeCue.test(blob)) return false;

  // Require narrative cue or explicit fiction kind — never length alone
  return narrativeCue.test(blob) || /소설|동화|신화|이야기/.test(s.kind);
}

export async function listCharactersForStory(input: {
  textbookId: string;
  unitId: string;
  story: { title: string; summary: string; excerpt: string };
}): Promise<{ characters: StoryCharacter[] }> {
  const unit = getUnit(input.textbookId, input.unitId);
  if (!unit) {
    throw Object.assign(new Error('Unit not found'), { status: 404 });
  }

  const resolved = resolveStory(input.textbookId, unit, input.story.title);
  if (!resolved) {
    throw Object.assign(new Error('Story not found in textbook unit'), { status: 400 });
  }

  const characters = getUnitStoryCharacters(
    input.textbookId,
    input.unitId,
    resolved.title
  );
  return { characters };
}

function embodyKey(
  userId: string,
  textbookId: string,
  unitId: string,
  storyTitle: string,
  characterName: string
): string {
  const raw = [
    userId,
    textbookId,
    unitId,
    normalizeStoryTitle(storyTitle),
    characterName.trim().toLowerCase(),
  ].join('|');
  return createHash('sha256').update(raw).digest('hex').slice(0, 40);
}

export async function embodyStoryCharacter(input: {
  userId: string;
  textbookId: string;
  unitId: string;
  story: { title: string; summary: string; excerpt: string };
  character: {
    name: string;
    role: string;
    description: string;
    avatar_emoji?: string;
  };
  language?: string;
}): Promise<{
  personaId: string;
  name: string;
  description: string;
  avatar_emoji: string;
  greeting: string;
  system_prompt: string;
  icebreakers?: string[];
}> {
  const unit = getUnit(input.textbookId, input.unitId);
  if (!unit) {
    throw Object.assign(new Error('Unit not found'), { status: 404 });
  }

  const resolved = resolveStory(input.textbookId, unit, input.story.title);
  if (!resolved) {
    throw Object.assign(new Error('Story not found in textbook unit'), { status: 400 });
  }

  const key = embodyKey(
    input.userId,
    input.textbookId,
    input.unitId,
    resolved.title,
    input.character.name
  );

  const existing = getDb()
    .prepare(
      `SELECT id, name, description, system_prompt, language, avatar_emoji, greeting
       FROM personas WHERE embody_key = ? AND is_active = 1`
    )
    .get(key) as
    | {
        id: string;
        name: string;
        description: string;
        system_prompt: string;
        avatar_emoji: string;
        greeting: string | null;
      }
    | undefined;

  if (existing) {
    const greeting =
      existing.greeting ||
      `안녕, 난 ${existing.name}. ${resolved.title} 이야기… 뭐 궁금해?`;
    return {
      personaId: existing.id,
      name: existing.name,
      description: existing.description,
      avatar_emoji: existing.avatar_emoji,
      greeting,
      system_prompt: existing.system_prompt,
    };
  }

  // Rule-based persona — no LLM at embody time
  const built = buildPersonaFromCharacter({
    name: input.character.name,
    role: input.character.role,
    description: input.character.description,
    context: getUnitCharacterContext(
      input.textbookId,
      input.unitId,
      resolved.title,
      input.character.name
    ),
    storyTitle: resolved.title,
    storySummary: resolved.summary,
  });

  let system_prompt = built.system_prompt;
  let greeting = built.greeting;
  const icebreakers = built.icebreakers;

  const personaId = randomUUID();
  const now = new Date().toISOString();
  const description = `${resolved.title} · ${input.character.role} — ${input.character.description}`.slice(
    0,
    200
  );
  const avatar = input.character.avatar_emoji || '🙂';

  getDb()
    .prepare(
      `INSERT INTO personas (
         id, name, description, system_prompt, language, avatar_emoji,
         is_active, created_at, updated_at, owner_user_id, greeting, embody_key,
         unit_id, story_title, icebreakers_json
       ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      personaId,
      input.character.name.slice(0, 100),
      description,
      system_prompt,
      input.language || 'ko',
      avatar,
      now,
      now,
      input.userId,
      greeting,
      key,
      input.unitId,
      resolved.title.slice(0, 120),
      JSON.stringify(icebreakers)
    );

  return {
    personaId,
    name: input.character.name.slice(0, 100),
    description,
    avatar_emoji: avatar,
    greeting,
    system_prompt,
    icebreakers,
  };
}

export function getEmbodiedGreeting(personaId: string): string | null {
  const row = getDb()
    .prepare(`SELECT greeting FROM personas WHERE id = ?`)
    .get(personaId) as { greeting: string | null } | undefined;
  return row?.greeting || null;
}
