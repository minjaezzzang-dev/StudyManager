import { getDb } from '../db/sqlite';
import { normalizeEmail } from './users';

export interface PendingRegistration {
  email: string;
  passwordEncrypted: string;
  fullName: string;
  role: string;
  nativeLanguage: string;
  codeHash: string;
  attempts: number;
  sendCount: number;
  lastSentAt: string;
  expiresAt: string;
}

export function upsertPendingRegistration(pending: PendingRegistration): void {
  const email = normalizeEmail(pending.email);
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO pending_registrations (
        email, password_encrypted, full_name, role, native_language,
        code_hash, attempts, send_count, last_sent_at, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        password_encrypted = excluded.password_encrypted,
        full_name = excluded.full_name,
        role = excluded.role,
        native_language = excluded.native_language,
        code_hash = excluded.code_hash,
        attempts = excluded.attempts,
        send_count = excluded.send_count,
        last_sent_at = excluded.last_sent_at,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at`
    )
    .run(
      email,
      pending.passwordEncrypted,
      pending.fullName,
      pending.role,
      pending.nativeLanguage,
      pending.codeHash,
      pending.attempts,
      pending.sendCount,
      pending.lastSentAt,
      pending.expiresAt,
      now,
      now
    );
}

export function getPendingRegistration(email: string): PendingRegistration | null {
  const row = getDb()
    .prepare(`SELECT * FROM pending_registrations WHERE email = ?`)
    .get(normalizeEmail(email)) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    email: String(row.email),
    passwordEncrypted: String(row.password_encrypted),
    fullName: String(row.full_name),
    role: String(row.role),
    nativeLanguage: String(row.native_language),
    codeHash: String(row.code_hash),
    attempts: Number(row.attempts ?? 0),
    sendCount: Number(row.send_count ?? 1),
    lastSentAt: String(row.last_sent_at),
    expiresAt: String(row.expires_at),
  };
}

export function deletePendingRegistration(email: string): void {
  getDb()
    .prepare(`DELETE FROM pending_registrations WHERE email = ?`)
    .run(normalizeEmail(email));
}
