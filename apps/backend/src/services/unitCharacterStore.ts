import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { getTextbookSlug } from './textbookUnits';
import { resolveTextbookProcessDir, TEXTBOOK_CATALOG } from './textbookRag';

function slugForTextbook(textbookId: string): string | null {
  return (
    getTextbookSlug(textbookId) ||
    TEXTBOOK_CATALOG.find((t) => t.id === textbookId)?.slug ||
    null
  );
}

export type UnitCharacterDef = {
  name: string;
  role: string;
  description: string;
  avatar_emoji: string;
  /** RAG용 — 성격·장면·대사 힌트 */
  context?: string;
};

export type UnitStoryDef = {
  title: string;
  summary?: string;
  excerpt?: string;
  /** OCR 제목 별칭 (아부지 → 어부지리) */
  aliases?: string[];
  characters: UnitCharacterDef[];
};

export type UnitCharacterFile = {
  stories?: UnitStoryDef[];
  /** 작품 없이 단원 전용 커스텀 인물 */
  customCharacters?: Array<
    UnitCharacterDef & { story?: string }
  >;
};

export type StoryCharacter = {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar_emoji: string;
};

const STORY_TITLE_ALIASES: Record<string, string> = {
  아부지: '어부지리',
  퍽잦는소년: '책 짖는 소년',
  책깃는소년: '책 짖는 소년',
  박혁거세: '박혁거세 신화',
  프로메테우스: '프로메테우스 신화',
};

function normalizeStoryTitle(title: string): string {
  return title.replace(/[「」『』"'‘’?.!\s]/g, '').toLowerCase();
}

function canonicalStoryTitle(title: string): string {
  const raw = normalizeStoryTitle(title);
  const aliased = STORY_TITLE_ALIASES[raw];
  return aliased || title.trim();
}

function unitFilePath(slug: string, unitId: string): string {
  return path.join(resolveTextbookProcessDir(), 'unit_characters', slug, `${unitId}.json`);
}

function readUnitFile(slug: string, unitId: string): UnitCharacterFile | null {
  const filePath = unitFilePath(slug, unitId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as UnitCharacterFile;
  } catch (err) {
    console.warn(`[unitCharacterStore] invalid JSON: ${filePath}`, err);
    return null;
  }
}

function storyMatches(story: UnitStoryDef, title: string): boolean {
  const canon = canonicalStoryTitle(title);
  const normCanon = normalizeStoryTitle(canon);
  const candidates = [story.title, ...(story.aliases || [])];
  return candidates.some((t) => {
    const n = normalizeStoryTitle(t);
    return n === normCanon || n.includes(normCanon) || normCanon.includes(n);
  });
}

function mapCharacters(chars: UnitCharacterDef[]): StoryCharacter[] {
  return chars.map((c) => ({
    id: randomUUID(),
    name: c.name.slice(0, 40),
    role: (c.role || '등장인물').slice(0, 40),
    description: (c.description || '').slice(0, 160),
    avatar_emoji: (c.avatar_emoji || '🙂').slice(0, 8),
  }));
}

export function getUnitCharacterContext(
  textbookId: string,
  unitId: string,
  storyTitle: string,
  characterName: string
): string | undefined {
  const file = loadUnitCharacterFile(textbookId, unitId);
  if (!file) return undefined;

  const story = file.stories?.find((s) => storyMatches(s, storyTitle));
  const fromStory = story?.characters?.find((c) => c.name === characterName)?.context;
  if (fromStory) return fromStory;

  const custom = (file.customCharacters || []).find((c) => c.name === characterName);
  return custom?.context;
}

export function loadUnitCharacterFile(
  textbookId: string,
  unitId: string
): UnitCharacterFile | null {
  const slug = slugForTextbook(textbookId);
  if (!slug) return null;
  return readUnitFile(slug, unitId);
}

export function listUnitFileStories(
  textbookId: string,
  unitId: string
): Array<{
  id: string;
  title: string;
  summary: string;
  excerpt: string;
  characters: StoryCharacter[];
}> {
  const file = loadUnitCharacterFile(textbookId, unitId);
  if (!file) return [];

  const out = (file.stories || []).map((s) => ({
    id: randomUUID(),
    title: s.title.trim().slice(0, 80),
    summary: (s.summary || `「${s.title}」에 나오는 이야기입니다.`).slice(0, 200),
    excerpt: (s.excerpt || '').slice(0, 600),
    characters: mapCharacters(s.characters || []),
  }));

  const custom = file.customCharacters || [];
  const byStory = new Map<string, UnitCharacterDef[]>();
  const loose: UnitCharacterDef[] = [];
  for (const c of custom) {
    if (c.story?.trim()) {
      const key = c.story.trim();
      const list = byStory.get(key) || [];
      list.push(c);
      byStory.set(key, list);
    } else {
      loose.push(c);
    }
  }

  for (const [storyTitle, chars] of byStory) {
    if (out.some((s) => storyMatches({ title: s.title, characters: [] }, storyTitle))) continue;
    out.push({
      id: randomUUID(),
      title: storyTitle.slice(0, 80),
      summary: `「${storyTitle}」와 함께 이야기해요.`,
      excerpt: '',
      characters: mapCharacters(chars),
    });
  }

  if (loose.length) {
    out.push({
      id: randomUUID(),
      title: '단원 이야기 친구',
      summary: '이 단원에서 함께 이야기할 수 있는 인물들입니다.',
      excerpt: '',
      characters: mapCharacters(loose),
    });
  }

  return out;
}

export function getUnitStoryCharacters(
  textbookId: string,
  unitId: string,
  storyTitle: string
): StoryCharacter[] {
  const file = loadUnitCharacterFile(textbookId, unitId);
  if (!file) return [];

  const story = file.stories?.find((s) => storyMatches(s, storyTitle));
  if (story?.characters?.length) return mapCharacters(story.characters);

  if (storyTitle.trim() === '단원 이야기 친구') {
    const loose = (file.customCharacters || []).filter((c) => !c.story?.trim());
    if (loose.length) return mapCharacters(loose);
  }

  const canon = canonicalStoryTitle(storyTitle);
  const custom = (file.customCharacters || []).filter(
    (c) => Boolean(c.story?.trim()) && storyMatches({ title: c.story!, characters: [] }, canon)
  );
  if (custom.length) return mapCharacters(custom);

  return [];
}

export function resolveUnitStory(
  textbookId: string,
  unitId: string,
  title: string
): { title: string; summary: string; excerpt: string } | null {
  const file = loadUnitCharacterFile(textbookId, unitId);
  const story = file?.stories?.find((s) => storyMatches(s, title));
  if (story) {
    return {
      title: story.title.trim().slice(0, 80),
      summary: (story.summary || `「${story.title}」에 나오는 이야기입니다.`).slice(0, 200),
      excerpt: (story.excerpt || '').slice(0, 700),
    };
  }

  if (title.trim() === '단원 이야기 친구' && file?.customCharacters?.length) {
    return {
      title: '단원 이야기 친구',
      summary: '이 단원에서 함께 이야기할 수 있는 인물들입니다.',
      excerpt: '',
    };
  }

  const customStory = file?.customCharacters?.find((c) => c.story && storyMatches({ title: c.story, characters: [] }, title));
  if (customStory?.story) {
    return {
      title: customStory.story.trim().slice(0, 80),
      summary: `「${customStory.story}」와 함께 이야기해요.`,
      excerpt: '',
    };
  }

  return null;
}

/** Flatten all RAG-indexable text blocks for a unit file */
export function unitCharacterRagDocuments(
  textbookId: string,
  slug: string,
  unitId: string,
  file: UnitCharacterFile
): Array<{
  storyTitle: string;
  characterName: string;
  content: string;
}> {
  const docs: Array<{ storyTitle: string; characterName: string; content: string }> = [];

  for (const story of file.stories || []) {
    for (const c of story.characters || []) {
      const parts = [
        `교과 단원 인물`,
        `textbook_id: ${textbookId}`,
        `unit_id: ${unitId}`,
        `작품: ${story.title}`,
        `이름: ${c.name}`,
        `역할: ${c.role}`,
        c.description,
        c.context || '',
        story.excerpt ? `발췌: ${story.excerpt}` : '',
      ].filter(Boolean);
      docs.push({
        storyTitle: story.title,
        characterName: c.name,
        content: parts.join('\n'),
      });
    }
  }

  for (const c of file.customCharacters || []) {
    const parts = [
      `교과 단원 커스텀 인물`,
      `textbook_id: ${textbookId}`,
      `unit_id: ${unitId}`,
      c.story ? `작품: ${c.story}` : '',
      `이름: ${c.name}`,
      `역할: ${c.role}`,
      c.description,
      c.context || '',
    ].filter(Boolean);
    docs.push({
      storyTitle: c.story || '',
      characterName: c.name,
      content: parts.join('\n'),
    });
  }

  return docs;
}

export function listAllUnitCharacterFiles(): Array<{ slug: string; unitId: string; filePath: string }> {
  const root = path.join(resolveTextbookProcessDir(), 'unit_characters');
  if (!fs.existsSync(root)) return [];
  const out: Array<{ slug: string; unitId: string; filePath: string }> = [];
  for (const slug of fs.readdirSync(root)) {
    const dir = path.join(root, slug);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json')) continue;
      out.push({
        slug,
        unitId: name.replace(/\.json$/, ''),
        filePath: path.join(dir, name),
      });
    }
  }
  return out;
}
