import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from './crypto';

describe('crypto', () => {
  it('round-trips encrypted secrets', () => {
    const secret = 'test-jwt-secret-key-min-32-characters-long';
    const plaintext = 'Password1!';
    const encrypted = encryptSecret(plaintext, secret);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted, secret)).toBe(plaintext);
  });

  it('fails with wrong secret', () => {
    const encrypted = encryptSecret('Password1!', 'correct-secret-at-least-32-chars!!');
    expect(() => decryptSecret(encrypted, 'wrong-secret-at-least-32-chars!!!!')).toThrow();
  });
});
