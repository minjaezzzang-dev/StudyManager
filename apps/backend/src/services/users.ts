import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/sqlite';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string;
  role: string;
  native_language: string;
  preferred_language: string;
  nationality: string;
  oauth_provider: string | null;
  oauth_subject: string | null;
  created_at: string;
  updated_at: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findUserByEmail(email: string): UserRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(normalizeEmail(email)) as UserRow | undefined;
  return row ?? null;
}

export function findUserById(id: string): UserRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as UserRow | undefined;
  return row ?? null;
}

export function findUserByOAuth(provider: string, subject: string): UserRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM users WHERE oauth_provider = ? AND oauth_subject = ?`)
    .get(provider, subject) as UserRow | undefined;
  return row ?? null;
}

export function createUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: string;
  nativeLanguage: string;
}): UserRow {
  const now = new Date().toISOString();
  const user: UserRow = {
    id: uuidv4(),
    email: normalizeEmail(input.email),
    password_hash: bcrypt.hashSync(input.password, 10),
    full_name: input.fullName,
    role: input.role,
    native_language: input.nativeLanguage,
    preferred_language: input.nativeLanguage,
    nationality: input.nativeLanguage,
    oauth_provider: null,
    oauth_subject: null,
    created_at: now,
    updated_at: now,
  };

  getDb()
    .prepare(
      `INSERT INTO users (
        id, email, password_hash, full_name, role,
        native_language, preferred_language, nationality,
        oauth_provider, oauth_subject, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      user.email,
      user.password_hash,
      user.full_name,
      user.role,
      user.native_language,
      user.preferred_language,
      user.nationality,
      user.oauth_provider,
      user.oauth_subject,
      user.created_at,
      user.updated_at
    );

  return user;
}

export function createOrLinkOAuthUser(input: {
  provider: string;
  subject: string;
  email: string;
  fullName: string;
  role?: string;
  nativeLanguage?: string;
}): UserRow {
  const existingOAuth = findUserByOAuth(input.provider, input.subject);
  if (existingOAuth) return existingOAuth;

  const byEmail = findUserByEmail(input.email);
  if (byEmail) {
    getDb()
      .prepare(
        `UPDATE users SET oauth_provider = ?, oauth_subject = ?, updated_at = ? WHERE id = ?`
      )
      .run(input.provider, input.subject, new Date().toISOString(), byEmail.id);
    return findUserById(byEmail.id)!;
  }

  const now = new Date().toISOString();
  const nativeLanguage = input.nativeLanguage || 'ko';
  // Unusable hash — OAuth-only accounts cannot log in with password
  const passwordHash = bcrypt.hashSync(uuidv4() + uuidv4(), 10);
  const user: UserRow = {
    id: uuidv4(),
    email: normalizeEmail(input.email),
    password_hash: passwordHash,
    full_name: input.fullName,
    role: input.role || 'student',
    native_language: nativeLanguage,
    preferred_language: nativeLanguage,
    nationality: nativeLanguage,
    oauth_provider: input.provider,
    oauth_subject: input.subject,
    created_at: now,
    updated_at: now,
  };

  getDb()
    .prepare(
      `INSERT INTO users (
        id, email, password_hash, full_name, role,
        native_language, preferred_language, nationality,
        oauth_provider, oauth_subject, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      user.email,
      user.password_hash,
      user.full_name,
      user.role,
      user.native_language,
      user.preferred_language,
      user.nationality,
      user.oauth_provider,
      user.oauth_subject,
      user.created_at,
      user.updated_at
    );

  return user;
}

export function verifyPassword(user: UserRow, password: string): boolean {
  if (!user.password_hash) return false;
  return bcrypt.compareSync(password, user.password_hash);
}

export function toPublicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    name: user.full_name,
    role: user.role,
    native_language: user.native_language,
    preferred_language: user.preferred_language,
    nationality: user.nationality,
    oauth_provider: user.oauth_provider,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
