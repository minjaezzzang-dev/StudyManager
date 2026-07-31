import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { PERSONA_SEEDS } from '../services/personaVoice';

let db: Database.Database | null = null;


function resolveDataDir(explicit?: string): string {
  if (explicit) return path.resolve(explicit);
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);

  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return path.join(dir, '.data');
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), '.data');
}

function ensureColumn(
  database: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      native_language TEXT NOT NULL DEFAULT 'ko',
      preferred_language TEXT NOT NULL DEFAULT 'ko',
      nationality TEXT NOT NULL DEFAULT 'ko',
      oauth_provider TEXT,
      oauth_subject TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_registrations (
      email TEXT PRIMARY KEY,
      password_encrypted TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      native_language TEXT NOT NULL DEFAULT 'ko',
      code_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      send_count INTEGER NOT NULL DEFAULT 1,
      last_sent_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source_text TEXT NOT NULL,
      target_text TEXT NOT NULL,
      source_language TEXT NOT NULL,
      target_language TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'text',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      translated_content TEXT,
      author_id TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      system_prompt TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'ko',
      avatar_emoji TEXT NOT NULL DEFAULT '🧑‍🏫',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS debates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      stance TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'ko',
      messages TEXT NOT NULL DEFAULT '[]',
      is_complete INTEGER NOT NULL DEFAULT 0,
      feedback TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS persona_dialogs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      persona_id TEXT NOT NULL,
      user_message TEXT NOT NULL,
      persona_response TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'ko',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS textbooks (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      grade TEXT NOT NULL DEFAULT '',
      volume TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '국어',
      source_path TEXT NOT NULL DEFAULT '',
      page_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS text_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chunk_uuid TEXT NOT NULL UNIQUE,
      textbook_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      chunk_order INTEGER NOT NULL DEFAULT 0,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (textbook_id) REFERENCES textbooks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_translations_user_id ON translations(user_id);
    CREATE INDEX IF NOT EXISTS idx_notices_author_id ON notices(author_id);
    CREATE INDEX IF NOT EXISTS idx_debates_user_id ON debates(user_id);
    CREATE INDEX IF NOT EXISTS idx_persona_dialogs_user_id ON persona_dialogs(user_id);
    CREATE INDEX IF NOT EXISTS idx_text_chunks_textbook_id ON text_chunks(textbook_id);
    CREATE INDEX IF NOT EXISTS idx_text_chunks_page ON text_chunks(textbook_id, page_number);
  `);

  ensureColumn(database, 'users', 'oauth_provider', 'TEXT');
  ensureColumn(database, 'users', 'oauth_subject', 'TEXT');
  ensureColumn(database, 'debates', 'textbook_id', 'TEXT');
  ensureColumn(database, 'personas', 'owner_user_id', 'TEXT');
  ensureColumn(database, 'personas', 'greeting', 'TEXT');
  ensureColumn(database, 'personas', 'embody_key', 'TEXT');
  ensureColumn(database, 'personas', 'unit_id', 'TEXT');
  ensureColumn(database, 'personas', 'story_title', 'TEXT');
  ensureColumn(database, 'personas', 'icebreakers_json', 'TEXT');
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_embody_key
      ON personas(embody_key) WHERE embody_key IS NOT NULL;
  `);
  seedPersonas(database);

  const ftsExists = database
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='text_chunks_fts'`)
    .get() as { name: string } | undefined;
  if (!ftsExists) {
    database.exec(`
      CREATE VIRTUAL TABLE text_chunks_fts USING fts5(
        content,
        content='text_chunks',
        content_rowid='id'
      );
    `);
  }
}

function seedPersonas(database: Database.Database): void {
  const now = new Date().toISOString();

  const upsert = database.prepare(
    `INSERT INTO personas (id, name, description, system_prompt, language, avatar_emoji, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name,
       description=excluded.description,
       system_prompt=excluded.system_prompt,
       language=excluded.language,
       avatar_emoji=excluded.avatar_emoji,
       is_active=1,
       updated_at=excluded.updated_at`
  );

  for (const p of PERSONA_SEEDS) {
    upsert.run(
      p.id,
      p.name,
      p.description,
      p.system_prompt,
      p.language,
      p.avatar_emoji,
      now,
      now
    );
  }
}

export function getDb(): Database.Database {
  if (db) return db;

  const dataDir = resolveDataDir();
  fs.mkdirSync(dataDir, { recursive: true });
  const filePath = path.join(dataDir, 'easykr.sqlite');
  db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

/** Use an in-memory DB for unit tests. */
export function useMemoryDb(): Database.Database {
  if (db) {
    db.close();
  }
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
