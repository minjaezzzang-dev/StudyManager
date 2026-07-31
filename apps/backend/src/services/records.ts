import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/sqlite';

export interface TranslationRecord {
  id: string;
  user_id: string;
  source_text: string;
  target_text: string;
  source_language: string;
  target_language: string;
  mode: string;
  created_at: string;
}

export interface NoticeRecord {
  id: string;
  title: string;
  content: string;
  translated_content: Record<string, { title: string; content: string }> | null;
  author_id: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export function saveTranslation(input: {
  userId: string;
  sourceText: string;
  targetText: string;
  sourceLanguage: string;
  targetLanguage: string;
  mode: string;
}): TranslationRecord {
  const row: TranslationRecord = {
    id: uuidv4(),
    user_id: input.userId,
    source_text: input.sourceText,
    target_text: input.targetText,
    source_language: input.sourceLanguage,
    target_language: input.targetLanguage,
    mode: input.mode,
    created_at: new Date().toISOString(),
  };

  getDb()
    .prepare(
      `INSERT INTO translations (
        id, user_id, source_text, target_text, source_language, target_language, mode, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.id,
      row.user_id,
      row.source_text,
      row.target_text,
      row.source_language,
      row.target_language,
      row.mode,
      row.created_at
    );

  return row;
}

export function listTranslations(
  userId: string,
  opts: { limit?: number; offset?: number } = {}
): TranslationRecord[] {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  return getDb()
    .prepare(
      `SELECT * FROM translations WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(userId, limit, offset) as TranslationRecord[];
}

export function createNotice(input: {
  title: string;
  content: string;
  authorId: string;
  isPublished?: boolean;
  translatedContent?: Record<string, { title: string; content: string }>;
}): NoticeRecord {
  const now = new Date().toISOString();
  const isPublished = Boolean(input.isPublished);
  const row = {
    id: uuidv4(),
    title: input.title,
    content: input.content,
    translated_content: input.translatedContent
      ? JSON.stringify(input.translatedContent)
      : null,
    author_id: input.authorId,
    is_published: isPublished ? 1 : 0,
    published_at: isPublished ? now : null,
    created_at: now,
    updated_at: now,
  };

  getDb()
    .prepare(
      `INSERT INTO notices (
        id, title, content, translated_content, author_id, is_published, published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.id,
      row.title,
      row.content,
      row.translated_content,
      row.author_id,
      row.is_published,
      row.published_at,
      row.created_at,
      row.updated_at
    );

  return mapNotice(row);
}

export function listNotices(opts: { publishedOnly?: boolean; limit?: number; offset?: number } = {}): NoticeRecord[] {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const rows = opts.publishedOnly
    ? (getDb()
        .prepare(
          `SELECT * FROM notices WHERE is_published = 1 ORDER BY COALESCE(published_at, created_at) DESC LIMIT ? OFFSET ?`
        )
        .all(limit, offset) as Record<string, unknown>[])
    : (getDb()
        .prepare(
          `SELECT * FROM notices ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .all(limit, offset) as Record<string, unknown>[]);

  return rows.map(mapNotice);
}

export function getNoticeById(id: string): NoticeRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM notices WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapNotice(row) : null;
}

export function updateNoticeTranslations(
  id: string,
  translations: Record<string, { title: string; content: string }>
): NoticeRecord | null {
  const existing = getNoticeById(id);
  if (!existing) return null;

  const merged = { ...(existing.translated_content || {}), ...translations };
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `UPDATE notices SET translated_content = ?, is_published = 1, published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?`
    )
    .run(JSON.stringify(merged), now, now, id);

  return getNoticeById(id);
}

function mapNotice(row: Record<string, unknown>): NoticeRecord {
  let translated: NoticeRecord['translated_content'] = null;
  if (typeof row.translated_content === 'string' && row.translated_content) {
    try {
      translated = JSON.parse(row.translated_content);
    } catch {
      translated = null;
    }
  }

  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    translated_content: translated,
    author_id: String(row.author_id),
    is_published: Boolean(row.is_published),
    published_at: row.published_at ? String(row.published_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
