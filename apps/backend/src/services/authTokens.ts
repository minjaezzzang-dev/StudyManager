import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/sqlite';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

function parseDurationMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit] ?? fallbackMs);
}

export function signAccessToken(
  payload: AccessTokenPayload,
  secret: string,
  expiresIn: string
): string {
  return jwt.sign(
    { sub: payload.sub, email: payload.email, role: payload.role },
    secret,
    { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
  );
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string' || !decoded.sub || !decoded.email) {
    throw new Error('Invalid token payload');
  }
  return {
    sub: String(decoded.sub),
    email: String(decoded.email),
    role: String(decoded.role || 'student'),
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createRefreshToken(
  userId: string,
  refreshExpiresIn: string
): { token: string; expiresAt: string } {
  const token = randomBytes(48).toString('base64url');
  const expiresAt = new Date(
    Date.now() + parseDurationMs(refreshExpiresIn, 7 * 86_400_000)
  ).toISOString();

  getDb()
    .prepare(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(uuidv4(), userId, hashToken(token), expiresAt, new Date().toISOString());

  return { token, expiresAt };
}

export function rotateRefreshToken(
  rawToken: string,
  refreshExpiresIn: string
): { userId: string; token: string; expiresAt: string } | null {
  const database = getDb();
  const row = database
    .prepare(
      `SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = ?`
    )
    .get(hashToken(rawToken)) as
    | { id: string; user_id: string; expires_at: string }
    | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    database.prepare(`DELETE FROM refresh_tokens WHERE id = ?`).run(row.id);
    return null;
  }

  database.prepare(`DELETE FROM refresh_tokens WHERE id = ?`).run(row.id);
  const next = createRefreshToken(row.user_id, refreshExpiresIn);
  return { userId: row.user_id, ...next };
}

export function revokeRefreshToken(rawToken: string): void {
  getDb()
    .prepare(`DELETE FROM refresh_tokens WHERE token_hash = ?`)
    .run(hashToken(rawToken));
}

export function revokeAllRefreshTokensForUser(userId: string): void {
  getDb().prepare(`DELETE FROM refresh_tokens WHERE user_id = ?`).run(userId);
}

export function issueSession(
  user: { id: string; email: string; role: string },
  opts: { jwtSecret: string; accessExpiresIn: string; refreshExpiresIn: string }
) {
  const access_token = signAccessToken(
    { sub: user.id, email: user.email, role: user.role },
    opts.jwtSecret,
    opts.accessExpiresIn
  );
  const refresh = createRefreshToken(user.id, opts.refreshExpiresIn);
  return {
    access_token,
    refresh_token: refresh.token,
    expires_at: Math.floor(
      (Date.now() + parseDurationMs(opts.accessExpiresIn, 3_600_000)) / 1000
    ),
  };
}
