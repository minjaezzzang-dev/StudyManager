import { describe, expect, it } from 'vitest';
import { loadEnv } from '@dahamkee/shared/env';
import { translateNoticeContent, translateTextContent } from './translate';
import { usesNim } from './llm';

const hasNim = Boolean(process.env.NVIDIA_API_KEY || process.env.FORCE_NIM_TEST);

describe('NIM translation', () => {
  it.skipIf(!hasNim)('translates Korean to English via NVIDIA NIM', async () => {
    const env = loadEnv();
    expect(usesNim(env)).toBe(true);

    const out = await translateTextContent(env, {
      text: '안녕하세요. 학교에 오신 것을 환영합니다.',
      sourceLanguage: 'ko',
      targetLanguage: 'en',
    });

    expect(out.length).toBeGreaterThan(5);
    expect(out.toLowerCase()).not.toContain('[en]');
    expect(out.toLowerCase()).toMatch(/hello|welcome|school/);
  }, 60000);

  it.skipIf(!hasNim)('translates notice JSON via NVIDIA NIM', async () => {
    const env = loadEnv();
    const out = await translateNoticeContent(env, {
      title: '체육대회 안내',
      content: '내일 오전 10시에 운동장에서 체육대회가 있습니다.',
      targetLanguage: 'en',
    });

    expect(out.title.length).toBeGreaterThan(2);
    expect(out.content.length).toBeGreaterThan(5);
    expect(out.title.toLowerCase()).not.toContain('[en]');
  }, 60000);
});
