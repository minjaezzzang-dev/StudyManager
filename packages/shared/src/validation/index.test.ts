import { describe, expect, it } from 'vitest';
import { loginSchema, signUpSchema, translateTextSchema } from './index';

describe('validation schemas', () => {
  it('accepts valid login input', () => {
    const result = loginSchema.safeParse({
      email: 'student@example.com',
      password: 'secret',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email on login', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'secret',
    });
    expect(result.success).toBe(false);
  });

  it('requires matching passwords on signup', () => {
    const result = signUpSchema.safeParse({
      email: 'student@example.com',
      password: 'Password1',
      confirmPassword: 'Password2',
      fullName: 'Student',
      nationality: 'ko',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid translate text input', () => {
    const result = translateTextSchema.safeParse({
      sourceText: 'Hello',
      sourceLanguage: 'en',
      targetLanguage: 'ko',
      mode: 'text',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all twelve supported languages', () => {
    const result = translateTextSchema.safeParse({
      sourceText: 'Hello',
      sourceLanguage: 'ne',
      targetLanguage: 'tl',
      mode: 'text',
    });
    expect(result.success).toBe(true);
  });
});
