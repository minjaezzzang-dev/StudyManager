import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import { getDb } from '../db/sqlite';
import { quantizePromptText } from './promptQuantize';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;

export type TextbookMeta = {
  id: string;
  slug: string;
  title: string;
  grade: string;
  volume: string;
  subject: string;
  fileName: string;
};

export const TEXTBOOK_CATALOG: TextbookMeta[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    slug: 'korean-5-1-ga',
    title: '국어 5-1 가',
    grade: '5-1',
    volume: '가',
    subject: '국어',
    fileName: 'korean_5-1_ga(1).txt',
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    slug: 'korean-5-1-na',
    title: '국어 5-1 나',
    grade: '5-1',
    volume: '나',
    subject: '국어',
    fileName: 'korean_5-1_na(1).txt',
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    slug: 'korean-6-1-ga',
    title: '국어 6-1 가',
    grade: '6-1',
    volume: '가',
    subject: '국어',
    fileName: 'korean_6-1_ga(1).txt',
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    slug: 'korean-6-1-na',
    title: '국어 6-1 나',
    grade: '6-1',
    volume: '나',
    subject: '국어',
    fileName: 'korean_6-1_na(1).txt',
  },
];

export type ChunkHit = {
  chunkId: string;
  textbookId: string;
  title: string;
  pageNumber: number;
  chunkOrder: number;
  content: string;
};

function resolveMonorepoRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export function resolveTextbookProcessDir(): string {
  if (process.env.TEXTBOOK_PROCESS_DIR) {
    return path.resolve(process.env.TEXTBOOK_PROCESS_DIR);
  }
  return path.join(resolveMonorepoRoot(), 'textbook_process');
}

function isJunkPage(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 20) return true;
  const unkCount = (trimmed.match(/<unk>/gi) || []).length;
  if (unkCount >= 5) return true;
  if (/okay,\s*let'?s\s*see/i.test(trimmed)) return true;
  if (/i need to extract all the text/i.test(trimmed)) return true;
  return false;
}

function parsePages(raw: string): Array<{ pageNumber: number; content: string }> {
  const parts = raw.split(/^--- Page (\d+) ---$/m);
  const pages: Array<{ pageNumber: number; content: string }> = [];
  // split yields: [preamble, pageNum, content, pageNum, content, ...]
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const pageNumber = parseInt(parts[i], 10);
    const content = (parts[i + 1] || '').trim();
    if (!Number.isFinite(pageNumber) || isJunkPage(content)) continue;
    pages.push({ pageNumber, content });
  }
  return pages;
}

function chunkText(content: string): string[] {
  if (content.length <= CHUNK_SIZE) return [content];
  const chunks: string[] = [];
  let start = 0;
  while (start < content.length) {
    const end = Math.min(start + CHUNK_SIZE, content.length);
    chunks.push(content.slice(start, end).trim());
    if (end >= content.length) break;
    start = Math.max(0, end - CHUNK_OVERLAP);
  }
  return chunks.filter(Boolean);
}

export function ensureTextbookSchema(database: Database.Database): void {
  database.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_text_chunks_textbook_id ON text_chunks(textbook_id);
    CREATE INDEX IF NOT EXISTS idx_text_chunks_page ON text_chunks(textbook_id, page_number);
  `);

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

function ingestOne(
  database: Database.Database,
  meta: TextbookMeta,
  processDir: string
): { pages: number; chunks: number } {
  const sourcePath = path.join(processDir, meta.fileName);
  if (!fs.existsSync(sourcePath)) {
    console.warn(`[textbookRag] missing file: ${sourcePath}`);
    return { pages: 0, chunks: 0 };
  }

  const existing = database
    .prepare(`SELECT id, page_count FROM textbooks WHERE slug = ?`)
    .get(meta.slug) as { id: string; page_count: number } | undefined;

  if (existing && existing.page_count > 0) {
    const chunkCount = (
      database
        .prepare(`SELECT COUNT(*) as c FROM text_chunks WHERE textbook_id = ?`)
        .get(existing.id) as { c: number }
    ).c;
    if (chunkCount > 0) return { pages: existing.page_count, chunks: chunkCount };
  }

  const raw = fs.readFileSync(sourcePath, 'utf8');
  const pages = parsePages(raw);
  const now = new Date().toISOString();

  const insertBook = database.prepare(
    `INSERT INTO textbooks (id, slug, title, grade, volume, subject, source_path, page_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title=excluded.title,
       grade=excluded.grade,
       volume=excluded.volume,
       source_path=excluded.source_path,
       page_count=excluded.page_count,
       updated_at=excluded.updated_at`
  );

  const deleteChunks = database.prepare(`DELETE FROM text_chunks WHERE textbook_id = ?`);
  const insertChunk = database.prepare(
    `INSERT INTO text_chunks (chunk_uuid, textbook_id, page_number, chunk_order, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertFts = database.prepare(
    `INSERT INTO text_chunks_fts(rowid, content) VALUES (?, ?)`
  );
  const deleteFts = database.prepare(
    `INSERT INTO text_chunks_fts(text_chunks_fts, rowid, content) VALUES('delete', ?, ?)`
  );

  const chunks = database.transaction(() => {
    insertBook.run(
      meta.id,
      meta.slug,
      meta.title,
      meta.grade,
      meta.volume,
      meta.subject,
      sourcePath,
      pages.length,
      now,
      now
    );

    const oldIds = database
      .prepare(`SELECT id FROM text_chunks WHERE textbook_id = ?`)
      .all(meta.id) as Array<{ id: number }>;
    for (const row of oldIds) {
      deleteFts.run(row.id, '');
    }
    deleteChunks.run(meta.id);

    let chunkTotal = 0;
    for (const page of pages) {
      const pieces = chunkText(page.content);
      pieces.forEach((piece, order) => {
        const info = insertChunk.run(
          randomUUID(),
          meta.id,
          page.pageNumber,
          order,
          piece,
          now
        );
        insertFts.run(Number(info.lastInsertRowid), piece);
        chunkTotal += 1;
      });
    }
    return chunkTotal;
  })();

  return { pages: pages.length, chunks };
}

let ingestAttempted = false;

export function ensureTextbooksIngested(database?: Database.Database): void {
  const db = database || getDb();
  ensureTextbookSchema(db);

  if (ingestAttempted) return;
  ingestAttempted = true;

  const processDir = resolveTextbookProcessDir();
  if (!fs.existsSync(processDir)) {
    console.warn(`[textbookRag] textbook_process not found: ${processDir}`);
    return;
  }

  for (const meta of TEXTBOOK_CATALOG) {
    try {
      const result = ingestOne(db, meta, processDir);
      if (result.chunks > 0) {
        console.info(
          `[textbookRag] ${meta.slug}: ${result.pages} pages, ${result.chunks} chunks`
        );
      }
    } catch (err) {
      console.error(`[textbookRag] failed to ingest ${meta.slug}:`, err);
    }
  }
}

function extractSearchTerms(raw: string): string[] {
  const cleaned = raw
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const spaced = cleaned
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  const hangulRuns = raw.match(/[\uac00-\ud7a3]{2,}/g) || [];
  const merged = [...spaced, ...hangulRuns]
    .map((t) => t.replace(/"/g, ''))
    .filter(Boolean);
  // Prefer longer phrases; drop trivial particles-like shorts when we have better terms
  const unique = [...new Set(merged)].sort((a, b) => b.length - a.length);
  return unique.slice(0, 8);
}

function buildFtsQuery(raw: string): string | null {
  const terms = extractSearchTerms(raw);
  if (terms.length === 0) return null;
  // OR for recall on conversational Korean questions
  return terms
    .slice(0, 5)
    .map((t) => `"${t}"`)
    .join(' OR ');
}

export function searchTextbookChunks(input: {
  query: string;
  textbookId?: string | null;
  limit?: number;
}): ChunkHit[] {
  const db = getDb();
  ensureTextbookSchema(db);
  const limit = Math.min(10, Math.max(1, input.limit ?? 4));
  const q = input.query.trim();
  if (!q) return [];

  const ftsQuery = buildFtsQuery(q);
  const hits: ChunkHit[] = [];
  const seen = new Set<string>();

  const mapRow = (row: {
    chunk_uuid: string;
    textbook_id: string;
    title: string;
    page_number: number;
    chunk_order: number;
    content: string;
  }): ChunkHit => ({
    chunkId: row.chunk_uuid,
    textbookId: row.textbook_id,
    title: row.title,
    pageNumber: row.page_number,
    chunkOrder: row.chunk_order,
    content: row.content,
  });

  if (ftsQuery) {
    try {
      const sql = input.textbookId
        ? `SELECT c.chunk_uuid, c.textbook_id, t.title, c.page_number, c.chunk_order, c.content
           FROM text_chunks_fts f
           JOIN text_chunks c ON c.id = f.rowid
           JOIN textbooks t ON t.id = c.textbook_id
           WHERE text_chunks_fts MATCH ? AND c.textbook_id = ?
           ORDER BY bm25(text_chunks_fts)
           LIMIT ?`
        : `SELECT c.chunk_uuid, c.textbook_id, t.title, c.page_number, c.chunk_order, c.content
           FROM text_chunks_fts f
           JOIN text_chunks c ON c.id = f.rowid
           JOIN textbooks t ON t.id = c.textbook_id
           WHERE text_chunks_fts MATCH ?
           ORDER BY bm25(text_chunks_fts)
           LIMIT ?`;

      const rows = (
        input.textbookId
          ? db.prepare(sql).all(ftsQuery, input.textbookId, limit)
          : db.prepare(sql).all(ftsQuery, limit)
      ) as Array<{
        chunk_uuid: string;
        textbook_id: string;
        title: string;
        page_number: number;
        chunk_order: number;
        content: string;
      }>;

      for (const row of rows) {
        if (seen.has(row.chunk_uuid)) continue;
        seen.add(row.chunk_uuid);
        hits.push(mapRow(row));
      }
    } catch (err) {
      console.warn('[textbookRag] FTS query failed, falling back to LIKE:', err);
    }
  }

  if (hits.length < limit) {
    const terms = extractSearchTerms(q);
    const sql = input.textbookId
      ? `SELECT c.chunk_uuid, c.textbook_id, t.title, c.page_number, c.chunk_order, c.content
         FROM text_chunks c
         JOIN textbooks t ON t.id = c.textbook_id
         WHERE c.content LIKE ? AND c.textbook_id = ?
         LIMIT ?`
      : `SELECT c.chunk_uuid, c.textbook_id, t.title, c.page_number, c.chunk_order, c.content
         FROM text_chunks c
         JOIN textbooks t ON t.id = c.textbook_id
         WHERE c.content LIKE ?
         LIMIT ?`;
    const stmt = db.prepare(sql);
    for (const term of terms) {
      if (hits.length >= limit) break;
      const like = `%${term.slice(0, 40)}%`;
      const rows = (
        input.textbookId
          ? stmt.all(like, input.textbookId, limit * 2)
          : stmt.all(like, limit * 2)
      ) as Array<{
        chunk_uuid: string;
        textbook_id: string;
        title: string;
        page_number: number;
        chunk_order: number;
        content: string;
      }>;
      for (const row of rows) {
        if (seen.has(row.chunk_uuid)) continue;
        seen.add(row.chunk_uuid);
        hits.push(mapRow(row));
        if (hits.length >= limit) break;
      }
    }
  }

  return hits.slice(0, limit);
}

export function formatChunksAsContext(chunks: ChunkHit[]): string {
  if (chunks.length === 0) return '';
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] ${c.title} p.${c.pageNumber}\n${quantizePromptText(c.content, 500)}`
    )
    .join('\n\n');
}

export function listTextbooks(): Array<{
  id: string;
  slug: string;
  title: string;
  grade: string;
  volume: string;
  subject: string;
  page_count: number;
  chunk_count: number;
}> {
  const db = getDb();
  ensureTextbookSchema(db);
  const rows = db
    .prepare(
      `SELECT t.id, t.slug, t.title, t.grade, t.volume, t.subject, t.page_count,
              (SELECT COUNT(*) FROM text_chunks c WHERE c.textbook_id = t.id) as chunk_count
       FROM textbooks t
       ORDER BY t.grade ASC, t.volume ASC`
    )
    .all() as Array<{
    id: string;
    slug: string;
    title: string;
    grade: string;
    volume: string;
    subject: string;
    page_count: number;
    chunk_count: number;
  }>;
  return rows;
}

export function getTextbook(id: string) {
  const db = getDb();
  ensureTextbookSchema(db);
  return (
    (db
      .prepare(
        `SELECT t.*,
                (SELECT COUNT(*) FROM text_chunks c WHERE c.textbook_id = t.id) as chunk_count
         FROM textbooks t WHERE t.id = ?`
      )
      .get(id) as
      | {
          id: string;
          slug: string;
          title: string;
          grade: string;
          volume: string;
          subject: string;
          page_count: number;
          chunk_count: number;
          source_path: string;
        }
      | undefined) ?? null
  );
}

export function getTextbookPage(textbookId: string, pageNumber: number) {
  const db = getDb();
  ensureTextbookSchema(db);
  const rows = db
    .prepare(
      `SELECT chunk_uuid, page_number, chunk_order, content
       FROM text_chunks
       WHERE textbook_id = ? AND page_number = ?
       ORDER BY chunk_order ASC`
    )
    .all(textbookId, pageNumber) as Array<{
    chunk_uuid: string;
    page_number: number;
    chunk_order: number;
    content: string;
  }>;
  if (rows.length === 0) return null;
  return {
    textbookId,
    pageNumber,
    content: rows.map((r) => r.content).join('\n'),
    chunks: rows,
  };
}
