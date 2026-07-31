import { describe, expect, it, beforeAll } from 'vitest';
import { getDb } from '../db/sqlite';
import {
  ensureUnitCharactersIngested,
  searchUnitCharacterChunks,
} from './unitCharacterRag';
import { TEXTBOOK_CATALOG } from './textbookRag';

const GA = TEXTBOOK_CATALOG.find((t) => t.slug === 'korean-5-1-ga')!.id;

describe('unitCharacterRag', () => {
  beforeAll(() => {
    ensureUnitCharactersIngested(getDb());
  });

  it('indexes and searches unit character chunks', () => {
    const hits = searchUnitCharacterChunks({
      textbookId: GA,
      unitId: 'ga-1',
      query: '진서 도깨비',
      storyTitle: '책을 돌려주세요',
      characterName: '진서',
      limit: 2,
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.characterName === '진서')).toBe(true);
  });
});
