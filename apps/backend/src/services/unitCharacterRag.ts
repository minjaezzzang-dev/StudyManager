import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import { getDb } from '../db/sqlite';
import { TEXTBOOK_CATALOG } from './textbookRag';
import {
  listAllUnitCharacterFiles,
  loadUnitCharacterFile,
  unitCharacterRagDocuments,
  type UnitCharacterFile,
} from './unitCharacterStore';
import { quantizePromptText } from './promptQuantize';

export type UnitCharacterHit = {
  chunkId: string;
  textbookId: string;
  unitId: string;
  storyTitle: string;
  characterName: string;
  content: string;
};

let ingestAttempted = false;

export function ensureUnitCharacterSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS unit_character_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chunk_uuid TEXT NOT NULL UNIQUE,
      textbook_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      story_title TEXT NOT NULL DEFAULT '',
      character_name TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_unit_char_chunks_book_unit
      ON unit_character_chunks(textbook_id, unit_id);
  `);

  const ftsExists = database
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='unit_character_fts'`)
    .get() as { name: string } | undefined;

  if (!ftsExists) {
    database.exec(`
      CREATE VIRTUAL TABLE unit_character_fts USING fts5(
        content,
        content='unit_character_chunks',
        content_rowid='id'
      );
    `);
  }
}

function slugToTextbookId(slug: string): string | null {
  return TEXTBOOK_CATALOG.find((t) => t.slug === slug)?.id ?? null;
}

function ingestUnitFile(
  database: Database.Database,
  textbookId: string,
  slug: string,
  unitId: string,
  file: UnitCharacterFile
): number {
  const docs = unitCharacterRagDocuments(textbookId, slug, unitId, file);
  const now = new Date().toISOString();

  const deleteRows = database.prepare(
    `SELECT id FROM unit_character_chunks WHERE textbook_id = ? AND unit_id = ?`
  );
  const deleteFts = database.prepare(
    `INSERT INTO unit_character_fts(unit_character_fts, rowid, content) VALUES('delete', ?, ?)`
  );
  const deleteChunks = database.prepare(
    `DELETE FROM unit_character_chunks WHERE textbook_id = ? AND unit_id = ?`
  );
  const insertChunk = database.prepare(
    `INSERT INTO unit_character_chunks (chunk_uuid, textbook_id, unit_id, story_title, character_name, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertFts = database.prepare(
    `INSERT INTO unit_character_fts(rowid, content) VALUES (?, ?)`
  );

  return database.transaction(() => {
    for (const row of deleteRows.all(textbookId, unitId) as Array<{ id: number }>) {
      deleteFts.run(row.id, '');
    }
    deleteChunks.run(textbookId, unitId);

    let n = 0;
    for (const doc of docs) {
      const info = insertChunk.run(
        randomUUID(),
        textbookId,
        unitId,
        doc.storyTitle.slice(0, 80),
        doc.characterName.slice(0, 40),
        doc.content,
        now
      );
      insertFts.run(Number(info.lastInsertRowid), doc.content);
      n += 1;
    }
    return n;
  })();
}

export function ensureUnitCharactersIngested(database?: Database.Database): void {
  const db = database || getDb();
  ensureUnitCharacterSchema(db);
  if (ingestAttempted) return;
  ingestAttempted = true;

  for (const entry of listAllUnitCharacterFiles()) {
    const textbookId = slugToTextbookId(entry.slug);
    if (!textbookId) continue;
    const file = loadUnitCharacterFile(textbookId, entry.unitId);
    if (!file) continue;
    try {
      const n = ingestUnitFile(db, textbookId, entry.slug, entry.unitId, file);
      if (n > 0) {
        console.info(`[unitCharacterRag] ${entry.slug}/${entry.unitId}: ${n} chunks`);
      }
    } catch (err) {
      console.error(`[unitCharacterRag] ingest failed ${entry.filePath}:`, err);
    }
  }
}

function buildFtsQuery(raw: string): string | null {
  const terms = raw
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 6);
  if (!terms.length) return null;
  return terms.map((t) => `"${t}"`).join(' OR ');
}

export function searchUnitCharacterChunks(input: {
  textbookId: string;
  unitId: string;
  query: string;
  storyTitle?: string;
  characterName?: string;
  limit?: number;
}): UnitCharacterHit[] {
  const db = getDb();
  ensureUnitCharacterSchema(db);
  ensureUnitCharactersIngested(db);

  const limit = Math.min(8, Math.max(1, input.limit ?? 4));
  const q = [input.query, input.storyTitle, input.characterName].filter(Boolean).join(' ').trim();
  if (!q) return [];

  const hits: UnitCharacterHit[] = [];
  const seen = new Set<string>();

  const mapRow = (row: {
    chunk_uuid: string;
    textbook_id: string;
    unit_id: string;
    story_title: string;
    character_name: string;
    content: string;
  }): UnitCharacterHit => ({
    chunkId: row.chunk_uuid,
    textbookId: row.textbook_id,
    unitId: row.unit_id,
    storyTitle: row.story_title,
    characterName: row.character_name,
    content: row.content,
  });

  const ftsQuery = buildFtsQuery(q);
  if (ftsQuery) {
    try {
      const nameFilter = input.characterName?.trim();
      const rows = db
        .prepare(
          nameFilter
            ? `SELECT c.chunk_uuid, c.textbook_id, c.unit_id, c.story_title, c.character_name, c.content
               FROM unit_character_fts f
               JOIN unit_character_chunks c ON c.id = f.rowid
               WHERE unit_character_fts MATCH ?
                 AND c.textbook_id = ? AND c.unit_id = ?
                 AND c.character_name = ?
               ORDER BY bm25(unit_character_fts)
               LIMIT ?`
            : `SELECT c.chunk_uuid, c.textbook_id, c.unit_id, c.story_title, c.character_name, c.content
               FROM unit_character_fts f
               JOIN unit_character_chunks c ON c.id = f.rowid
               WHERE unit_character_fts MATCH ?
                 AND c.textbook_id = ? AND c.unit_id = ?
               ORDER BY bm25(unit_character_fts)
               LIMIT ?`
        )
        .all(
          ...(nameFilter
            ? [ftsQuery, input.textbookId, input.unitId, nameFilter, limit]
            : [ftsQuery, input.textbookId, input.unitId, limit])
        ) as Array<{
        chunk_uuid: string;
        textbook_id: string;
        unit_id: string;
        story_title: string;
        character_name: string;
        content: string;
      }>;

      for (const row of rows) {
        if (seen.has(row.chunk_uuid)) continue;
        seen.add(row.chunk_uuid);
        hits.push(mapRow(row));
      }
    } catch (err) {
      console.warn('[unitCharacterRag] FTS failed:', err);
    }
  }

  if (hits.length < limit && input.characterName) {
    const like = `%${input.characterName.slice(0, 20)}%`;
    const rows = db
      .prepare(
        `SELECT chunk_uuid, textbook_id, unit_id, story_title, character_name, content
         FROM unit_character_chunks
         WHERE textbook_id = ? AND unit_id = ? AND character_name LIKE ?
         ORDER BY CASE WHEN story_title = ? THEN 0 ELSE 1 END
         LIMIT ?`
      )
      .all(
        input.textbookId,
        input.unitId,
        like,
        input.storyTitle || '',
        limit
      ) as Array<{
      chunk_uuid: string;
      textbook_id: string;
      unit_id: string;
      story_title: string;
      character_name: string;
      content: string;
    }>;
    for (const row of rows) {
      if (seen.has(row.chunk_uuid)) continue;
      seen.add(row.chunk_uuid);
      hits.push(mapRow(row));
      if (hits.length >= limit) break;
    }
  }

  return hits.slice(0, limit);
}

export function formatUnitCharacterContext(hits: UnitCharacterHit[]): string {
  if (!hits.length) return '';
  return hits
    .map((h, i) => `[${i + 1}] ${h.storyTitle} · ${h.characterName}\n${quantizePromptText(h.content, 600)}`)
    .join('\n\n');
}
