import { getDb } from '../db/sqlite';
import { env } from '../config/env';
import { chatCompletion, isDemoLlm } from './llm';

export type TextbookUnit = {
  id: string;
  number: number | null;
  title: string;
  startPage: number;
  endPage: number;
  section: string;
};

/** Official 단원 map for ingested OCR textbooks (page numbers from TOC). */
const UNITS_BY_SLUG: Record<string, TextbookUnit[]> = {
  'korean-5-1-ga': [
    {
      id: 'ga-intro',
      number: null,
      title: '책을 읽고 함께 이야기해요',
      startPage: 6,
      endPage: 33,
      section: '독서 단원',
    },
    {
      id: 'ga-1',
      number: 1,
      title: '대화를 나누어요',
      startPage: 34,
      endPage: 69,
      section: '독서 단원',
    },
    {
      id: 'ga-2',
      number: 2,
      title: '체험한 일을 글로 써요',
      startPage: 70,
      endPage: 107,
      section: '독서 단원',
    },
    {
      id: 'ga-3',
      number: 3,
      title: '발표하고 질문해요',
      startPage: 108,
      endPage: 154,
      section: '독서 단원',
    },
  ],
  // page numbers = OCR/PDF page index in textbook_process (나 권은 책 면수와 다름)
  'korean-5-1-na': [
    {
      id: 'na-intro',
      number: null,
      title: '필요한 정보를 찾아요',
      startPage: 6,
      endPage: 33,
      section: '매체 단원',
    },
    {
      id: 'na-4',
      number: 4,
      title: '대상을 설명해요',
      startPage: 34,
      endPage: 71,
      section: '매체 단원',
    },
    {
      id: 'na-5',
      number: 5,
      title: '의논하며 토의해요',
      startPage: 72,
      endPage: 107,
      section: '매체 단원',
    },
    {
      id: 'na-6',
      number: 6,
      title: '작품을 즐겨요',
      startPage: 108,
      endPage: 154,
      section: '매체 단원',
    },
  ],
  'korean-6-1-ga': [
    {
      id: '6ga-intro',
      number: null,
      title: '같은 주제에 대한 책을 읽고 생각을 나누어요',
      startPage: 6,
      endPage: 33,
      section: '독서 단원',
    },
    {
      id: '6ga-1',
      number: 1,
      title: '자신의 삶과 관련지어 읽어요',
      startPage: 34,
      endPage: 87,
      section: '독서 단원',
    },
    {
      id: '6ga-2',
      number: 2,
      title: '바르게 고쳐 써요',
      startPage: 88,
      endPage: 119,
      section: '독서 단원',
    },
    {
      id: '6ga-3',
      number: 3,
      title: '절차를 지키며 토론해요',
      startPage: 120,
      endPage: 161,
      section: '독서 단원',
    },
  ],
  'korean-6-1-na': [
    {
      id: '6na-intro',
      number: null,
      title: '매체 자료를 만들어요',
      startPage: 6,
      endPage: 29,
      section: '매체 단원',
    },
    {
      id: '6na-4',
      number: 4,
      title: '상황에 맞게 표현해요',
      startPage: 30,
      endPage: 67,
      section: '매체 단원',
    },
    {
      id: '6na-5',
      number: 5,
      title: '자신의 글쓰기 과정을 살펴봐요',
      startPage: 68,
      endPage: 109,
      section: '매체 단원',
    },
    {
      id: '6na-6',
      number: 6,
      title: '비판적으로 읽어요',
      startPage: 110,
      endPage: 149,
      section: '매체 단원',
    },
  ],
};

function getSlug(textbookId: string): string | null {
  const row = getDb()
    .prepare(`SELECT slug FROM textbooks WHERE id = ?`)
    .get(textbookId) as { slug: string } | undefined;
  return row?.slug ?? null;
}

export function getTextbookSlug(textbookId: string): string | null {
  return getSlug(textbookId);
}

export function listUnitsForTextbook(textbookId: string): TextbookUnit[] {
  const slug = getSlug(textbookId);
  if (!slug) return [];
  return UNITS_BY_SLUG[slug] || [];
}

export function getUnit(textbookId: string, unitId: string): TextbookUnit | null {
  return listUnitsForTextbook(textbookId).find((u) => u.id === unitId) || null;
}

export function getUnitPageSample(
  textbookId: string,
  unit: TextbookUnit,
  maxChars = 3500
): string {
  // Story extraction needs the whole unit — prose often sits after poems/activities.
  if (maxChars >= 5000) {
    return getUnitSpreadSample(textbookId, unit, maxChars);
  }

  const pageSpan = maxChars >= 3500 ? 12 : 5;
  const endPage = Math.min(unit.startPage + pageSpan, unit.endPage);
  const rowLimit = 16;
  const rows = getDb()
    .prepare(
      `SELECT page_number, content FROM text_chunks
       WHERE textbook_id = ? AND page_number BETWEEN ? AND ?
       ORDER BY page_number ASC, chunk_order ASC
       LIMIT ?`
    )
    .all(textbookId, unit.startPage, endPage, rowLimit) as Array<{
    page_number: number;
    content: string;
  }>;

  let out = '';
  for (const row of rows) {
    const block = `[p.${row.page_number}]\n${row.content}\n\n`;
    if (out.length + block.length > maxChars) {
      out += block.slice(0, maxChars - out.length);
      break;
    }
    out += block;
  }
  return out.trim();
}

/** Sample early / middle / late pages so novel texts aren't missed. */
export function getUnitSpreadSample(
  textbookId: string,
  unit: TextbookUnit,
  maxChars = 9000
): string {
  const rows = getDb()
    .prepare(
      `SELECT page_number, content FROM text_chunks
       WHERE textbook_id = ? AND page_number BETWEEN ? AND ?
       ORDER BY page_number ASC, chunk_order ASC`
    )
    .all(textbookId, unit.startPage, unit.endPage) as Array<{
    page_number: number;
    content: string;
  }>;

  if (rows.length === 0) return '';

  const proseHint =
    /이야기\s*감상|인상적인\s*부분을\s*생각하며\s*이[야]*기|신화|동화|소설|어느\s*날|주인공|읽어\s*봅시다/;
  const poemHint = /시\s*낭송|시\s*쓰기|비유적\s*표현을\s*살려\s*시|시를\s*읽고/;
  const drillHint = /물음에\s*답|빈칸|써\s*보세요|정리하기|스스로\s*확인/;

  const scoreRow = (text: string, i: number) => {
    let score = 0;
    if (proseHint.test(text)) score += 5;
    if (/었[다어]|았[다어]|였다/.test(text)) score += 2;
    if (/["“「].{4,}["”」]/.test(text)) score += 2;
    if (poemHint.test(text)) score -= 4;
    if (drillHint.test(text) && !proseHint.test(text)) score -= 3;
    // Later pages often hold 이야기 after 시
    if (i > rows.length * 0.4) score += 2;
    if (i > rows.length * 0.55) score += 2;
    return score;
  };

  // Budget: most room for later pages (이야기/신화 often follow 시)
  const earlyBudget = Math.floor(maxChars * 0.2);
  const lateBudget = maxChars - earlyBudget;
  const mid = Math.floor(rows.length * 0.35);
  const earlyRows = rows.slice(0, mid);
  const lateRows = rows.slice(mid);

  const pick = (
    source: Array<{ page_number: number; content: string }>,
    offset: number,
    budget: number
  ) => {
    const ranked = source
      .map((row, j) => ({ row, score: scoreRow(row.content || '', offset + j), j }))
      .sort((a, b) => b.score - a.score || a.j - b.j)
      .slice(0, 20)
      .sort((a, b) => a.row.page_number - b.row.page_number || a.j - b.j);

    let out = '';
    for (const { row } of ranked) {
      const block = `[p.${row.page_number}]\n${row.content}\n\n`;
      if (out.length + block.length > budget) {
        out += block.slice(0, budget - out.length);
        break;
      }
      out += block;
    }
    return out;
  };

  return `${pick(earlyRows, 0, earlyBudget)}\n\n${pick(lateRows, mid, lateBudget)}`.trim();
}

function parseTopicList(raw: string): string[] {
  const topics: string[] = [];
  // JSON array
  try {
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start >= 0 && end > start) {
      const arr = JSON.parse(raw.slice(start, end + 1));
      if (Array.isArray(arr)) {
        for (const item of arr) {
          const t = String(item).trim();
          if (t) topics.push(t);
        }
      }
    }
  } catch {
    // fall through
  }
  if (topics.length === 0) {
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*(?:\d+[\).]|[-*•])\s*(.+)$/);
      if (m?.[1]) topics.push(m[1].trim().replace(/^["']|["']$/g, ''));
    }
  }
  return [...new Set(topics)].filter((t) => t.length >= 4 && t.length <= 120).slice(0, 6);
}

/** 찬반 토론만 허용. "어떤 점이 좋을까요?" 같은 토의(열린 질문)은 거절. */
export function isProConDebateTopic(topic: string): boolean {
  const t = topic.trim();
  if (t.length < 8 || t.length > 120) return false;
  if (!/(까요\?|인가\?)$/.test(t)) return false;

  // Open-ended 토의 markers (who/what/when/where/why/how)
  const openEnded =
    /어떤|어떻게|왜\b|무엇|무슨|어디서|언제|누가|누구|얼마|몇\s|어떨까요|말해\s*보|이야기해\s*보|생각해\s*보|나눠\s*보|떠올려|찾아보/;
  if (openEnded.test(t)) return false;

  // Clear yes/no framing for 찬성/반대
  return /(할까요|필요할까요|나을까요|맞을까요|옳을까요|될까요|일까요)\?$/.test(t);
}

export async function suggestTopicsForUnit(input: {
  textbookId: string;
  unitId: string;
  language?: string;
  count?: number;
}): Promise<{ unit: TextbookUnit; topics: string[]; samplePreview: string }> {
  const unit = getUnit(input.textbookId, input.unitId);
  if (!unit) {
    throw Object.assign(new Error('Unit not found'), { status: 404 });
  }

  const sample = getUnitPageSample(input.textbookId, unit);
  const count = Math.min(6, Math.max(3, input.count ?? 4));
  const lang = input.language || 'ko';

  const book = getDb()
    .prepare(`SELECT title FROM textbooks WHERE id = ?`)
    .get(input.textbookId) as { title: string } | undefined;

  const fallback = [
    `${unit.title} 활동은 꼭 필요할까요?`,
    `친구와 ${unit.title} 내용을 함께 나누는 것이 혼자 공부하는 것보다 나을까요?`,
    `${unit.title}에서 배운 방법을 실생활에도 써야 할까요?`,
    `이 단원에서 가장 중요한 것은 말하기보다 듣기일까요?`,
  ].slice(0, count);

  if (isDemoLlm(env) || !sample) {
    return { unit, topics: fallback, samplePreview: sample.slice(0, 600) };
  }

  const prompt = `Korean elem debate (찬반). Book: ${book?.title || '국어'} / ${unit.title}
Propose ${count} yes/no questions ending in 까요? (~해야 할까요?, ~이 나을까요?)
FORBIDDEN: 어떤/어떻게/왜/무엇 open questions.
JSON array of strings only.

${sample.slice(0, 1200)}`;

  const raw = await chatCompletion(env, {
    tier: 'medium',
    temperature: 0.4,
    maxTokens: 800,
    messages: [
      {
        role: 'system',
        content:
          'Return only a JSON array of Korean yes/no debate (토론) questions. Never open-ended 토의 questions.',
      },
      { role: 'user', content: prompt },
    ],
  });

  let topics = parseTopicList(raw).filter(isProConDebateTopic);
  if (topics.length < 2) {
    topics = fallback.filter(isProConDebateTopic);
  }
  if (topics.length < 2) {
    topics = fallback;
  }

  return {
    unit,
    topics: topics.slice(0, count),
    samplePreview: sample.slice(0, 600),
  };
}

/** 페르소나/토의용 — 열린 대화 주제 (찬반 토론과 다름). */
export function isChatTopic(topic: string): boolean {
  const t = topic.trim();
  if (t.length < 6 || t.length > 100) return false;
  // Prefer open conversation; drop pure yes/no debate-only lines
  if (isProConDebateTopic(t)) return false;
  return true;
}

export async function suggestChatTopicsForUnit(input: {
  textbookId: string;
  unitId: string;
  language?: string;
  count?: number;
}): Promise<{ unit: TextbookUnit; topics: string[]; samplePreview: string }> {
  const unit = getUnit(input.textbookId, input.unitId);
  if (!unit) {
    throw Object.assign(new Error('Unit not found'), { status: 404 });
  }

  const sample = getUnitPageSample(input.textbookId, unit);
  const count = Math.min(6, Math.max(3, input.count ?? 4));
  const lang = input.language || 'ko';

  const book = getDb()
    .prepare(`SELECT title FROM textbooks WHERE id = ?`)
    .get(input.textbookId) as { title: string } | undefined;

  const fallback = [
    `${unit.title}에서 인상 깊었던 부분 이야기해 줄래?`,
    `친구랑 ${unit.title} 내용을 같이 배우면 어떤 점이 좋을까?`,
    `이 단원에서 어려웠던 말은 뭐야?`,
    `${unit.title}을(를) 실생활에서 써 본 적 있어?`,
  ].slice(0, count);

  if (isDemoLlm(env) || !sample) {
    return { unit, topics: fallback, samplePreview: sample.slice(0, 600) };
  }

  const prompt = `Korean elem open chat topics for persona. Book: ${book?.title || '국어'} / ${unit.title}
Propose ${count} short conversation openers (feelings, scenes — not yes/no debate).
JSON array of strings only.

${sample.slice(0, 1200)}`;

  const raw = await chatCompletion(env, {
    tier: 'medium',
    temperature: 0.55,
    maxTokens: 800,
    messages: [
      {
        role: 'system',
        content:
          'Return only a JSON array of Korean conversation/토의 openers for chatting with a persona.',
      },
      { role: 'user', content: prompt },
    ],
  });

  let topics = parseTopicList(raw).filter(isChatTopic);
  if (topics.length < 2) {
    topics = fallback;
  }

  return {
    unit,
    topics: topics.slice(0, count),
    samplePreview: sample.slice(0, 600),
  };
}
