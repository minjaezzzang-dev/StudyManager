import { describe, expect, it } from 'vitest';
import { buildPersonaFromCharacter } from './personaBuilder';

describe('buildPersonaFromCharacter', () => {
  it('builds greeting and prompt from role + context', () => {
    const built = buildPersonaFromCharacter({
      name: '진서',
      role: '주인공',
      description: '도서관을 좋아하는 아이.',
      context: '비 오는 날 도서관에 간다. 도깨비와 친구가 된다.',
      storyTitle: '책을 돌려주세요',
      storySummary: '도서관에서 도깨비를 만나는 이야기',
    });

    expect(built.greeting).toContain('진서');
    expect(built.greeting).toContain('책을 돌려주세요');
    expect(built.system_prompt).toContain('진서');
    expect(built.system_prompt).toContain('1인칭');
    expect(built.icebreakers.length).toBeGreaterThanOrEqual(3);
  });

  it('uses teacher speech profile for 선생님 role', () => {
    const built = buildPersonaFromCharacter({
      name: '김선생',
      role: '선생님',
      description: '사서 선생님.',
      storyTitle: '책을 돌려주세요',
    });

    expect(built.system_prompt).toMatch(/존댓말|다정/);
    expect(built.greeting).toContain('김선생');
  });
});
