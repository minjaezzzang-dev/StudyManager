import { describe, expect, it } from 'vitest';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  otpExpiresAt,
  isExpired,
} from './otp';

describe('otp', () => {
  it('generates zero-padded 6-digit codes', () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateOtp(6);
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it('hashes and verifies codes with secret', () => {
    const code = '123456';
    const hash = hashOtp(code, 'secret');
    expect(verifyOtpHash('123456', hash, 'secret')).toBe(true);
    expect(verifyOtpHash('000000', hash, 'secret')).toBe(false);
    expect(verifyOtpHash('123456', hash, 'other')).toBe(false);
  });

  it('computes expiry and detects expiration', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const expires = otpExpiresAt(10, from);
    expect(expires.toISOString()).toBe('2026-01-01T00:10:00.000Z');
    expect(isExpired(expires, new Date('2026-01-01T00:09:59.000Z'))).toBe(false);
    expect(isExpired(expires, new Date('2026-01-01T00:10:00.000Z'))).toBe(true);
  });
});
