import { describe, expect, it } from 'vitest';
import { getStoryCharacters } from './unitStories';
import { TEXTBOOK_CATALOG } from './textbookRag';

const GA = TEXTBOOK_CATALOG.find((t) => t.slug === 'korean-5-1-ga')!.id;
const NA = TEXTBOOK_CATALOG.find((t) => t.slug === 'korean-5-1-na')!.id;

describe('getStoryCharacters (unit JSON files)', () => {
  it('returns characters from unit file', () => {
    expect(getStoryCharacters(GA, 'ga-3', '진짜 행운').map((c) => c.name)).toEqual([
      '나',
      '마담 안나',
      '엄마',
    ]);
    expect(getStoryCharacters(NA, 'na-6', '사랑이 뭔데요?').length).toBeGreaterThanOrEqual(3);
  });

  it('resolves title aliases in unit file', () => {
    expect(getStoryCharacters(NA, 'na-6', '아부지').map((c) => c.name)).toContain('어부');
  });

  it('returns empty for unknown unit or title', () => {
    expect(getStoryCharacters(GA, 'ga-1', '존재하지 않는 작품')).toEqual([]);
    expect(getStoryCharacters(GA, 'ga-2', '진짜 행운')).toEqual([]);
  });
});
