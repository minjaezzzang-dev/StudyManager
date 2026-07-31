import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __setOcrWorkerForTests, recognizeImageText, shutdownOcr } from './ocr';

describe('ocr service', () => {
  beforeEach(async () => {
    await shutdownOcr();
  });

  it('recognizes text via worker', async () => {
    const recognize = vi.fn().mockResolvedValue({
      data: { text: '  Hello OCR  ' },
    });
    __setOcrWorkerForTests({ recognize, terminate: vi.fn() } as never);

    const result = await recognizeImageText({
      imageBase64: 'AAA',
      languageHints: ['en'],
    });

    expect(recognize).toHaveBeenCalled();
    expect(result.text).toBe('Hello OCR');
    expect(result.detectedLanguage).toBe('en');
  });
});
