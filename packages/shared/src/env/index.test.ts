import { describe, expect, it } from 'vitest';
import { appMetaSchema, frontendSchema } from './index';

describe('env schemas', () => {
  it('applies defaults for app metadata', () => {
    const result = appMetaSchema.parse({});
    expect(result.APP_NAME).toBe('EasyKR');
    expect(result.APP_ENV).toBe('development');
  });

  it('requires public frontend URLs', () => {
    const result = frontendSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts minimal frontend env', () => {
    const result = frontendSchema.safeParse({
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_API_URL: 'http://localhost:10001',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-1234567890',
    });
    expect(result.success).toBe(true);
  });
});
