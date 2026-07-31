import { createHash, randomInt } from 'crypto';

export function generateOtp(length = 6): string {
  const max = 10 ** length;
  return randomInt(0, max).toString().padStart(length, '0');
}

export function hashOtp(code: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${code}`).digest('hex');
}

export function verifyOtpHash(code: string, codeHash: string, secret: string): boolean {
  return hashOtp(code, secret) === codeHash;
}

export function otpExpiresAt(minutes: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + minutes * 60_000);
}

export function isExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}
