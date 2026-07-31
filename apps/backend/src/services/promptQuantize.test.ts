import { describe, expect, it } from 'vitest';
import { quantizePromptText, stripHanAndCjk } from './promptQuantize';

describe('promptQuantize', () => {
  it('strips Han/CJK from OCR-like text', () => {
    expect(stripHanAndCjk('사랑帮助과 希望')).toBe('사랑과 ');
    expect(quantizePromptText('「物語」 테스트  文')).toBe('테스트');
  });

  it('collapses whitespace and caps length', () => {
    expect(quantizePromptText('a   b\n\n\n c')).toBe('a b\n\n c');
    expect(quantizePromptText('1234567890', 5)).toBe('12345');
  });
});
