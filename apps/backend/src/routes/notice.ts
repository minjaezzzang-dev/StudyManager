// =============================================================
// EasyKR Backend — Notice Routes (SQLite + multilingual translate)
// =============================================================

import { Router, Request, Response } from 'express';

import {
  createNoticeSchema,
  updateNoticeSchema,
  translateNoticeSchema,
  uuidParamSchema,
  paginationSchema,
} from '../routes/schemas';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { env } from '../config/env';
import { translateNoticeContent } from '../services/translate';
import {
  createNotice,
  getNoticeById,
  listNotices,
  updateNoticeTranslations,
} from '../services/records';
import { findUserById } from '../services/users';
import { getDb } from '../db/sqlite';

const router = Router();

function withDisplay(
  notice: NonNullable<ReturnType<typeof getNoticeById>>,
  preferredLang: string
) {
  const tr = notice.translated_content?.[preferredLang];
  return {
    ...notice,
    display_title: tr?.title || notice.title,
    display_content: tr?.content || notice.content,
  };
}

// ─────────────────────────────────────────────────────────────
// POST /api/notices — Create notice (teacher/admin)
// ─────────────────────────────────────────────────────────────
router.post('/', validateBody(createNoticeSchema), async (req: Request, res: Response) => {
  try {
    if (!['teacher', 'admin'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { title, content, targetLanguages } = req.body;
    let translatedContent: Record<string, { title: string; content: string }> | undefined;

    if (targetLanguages?.length) {
      translatedContent = {};
      for (const lang of targetLanguages) {
        translatedContent[lang] = await translateNoticeContent(env, {
          title,
          content,
          targetLanguage: lang,
        });
      }
    }

    const notice = createNotice({
      title,
      content,
      authorId: req.user!.id,
      isPublished: true,
      translatedContent,
    });

    res.status(201).json(notice);
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ error: 'Failed to create notice' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/notices/translate — Translate existing notice
// ─────────────────────────────────────────────────────────────
router.post('/translate', validateBody(translateNoticeSchema), async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { noticeId, title, content, targetLanguages } = req.body;
    const existing = getNoticeById(noticeId);
    if (!existing) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    const translations: Record<string, { title: string; content: string }> = {};
    for (const lang of targetLanguages) {
      translations[lang] = await translateNoticeContent(env, {
        title,
        content,
        targetLanguage: lang,
      });
    }

    const updated = updateNoticeTranslations(noticeId, translations);
    res.json({ translations, notice: updated, message: 'Notice translated successfully' });
  } catch (error) {
    console.error('Translate notice error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/notices — List notices
// ─────────────────────────────────────────────────────────────
router.get('/', validateQuery(paginationSchema), async (req, res) => {
  try {
    const pageNum = Number(req.query.page || 1);
    const limitNum = Number(req.query.limit || 20);
    const offset = (pageNum - 1) * limitNum;

    const user = findUserById(req.user!.id);
    const preferredLang = user?.preferred_language || 'ko';
    const isStaff = ['teacher', 'admin'].includes(req.user!.role);

    const notices = listNotices({
      publishedOnly: !isStaff,
      limit: limitNum,
      offset,
    });

    res.json({
      notices: notices.map((n) => withDisplay(n, preferredLang)),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: notices.length,
        totalPages: pageNum,
      },
    });
  } catch (error) {
    console.error('List notices error:', error);
    res.status(500).json({ error: 'Failed to fetch notices' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/notices/:id
// ─────────────────────────────────────────────────────────────
router.get('/:id', validateParams(uuidParamSchema), async (req, res) => {
  try {
    const user = findUserById(req.user!.id);
    const preferredLang = user?.preferred_language || 'ko';
    const notice = getNoticeById(req.params.id);

    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    if (
      !notice.is_published &&
      notice.author_id !== req.user!.id &&
      req.user!.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(withDisplay(notice, preferredLang));
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({ error: 'Failed to fetch notice' });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/notices/:id
// ─────────────────────────────────────────────────────────────
router.patch(
  '/:id',
  validateParams(uuidParamSchema),
  validateBody(updateNoticeSchema),
  async (req, res) => {
    try {
      const notice = getNoticeById(req.params.id);
      if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
      }
      if (notice.author_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to update this notice' });
      }

      const title = req.body.title ?? notice.title;
      const content = req.body.content ?? notice.content;
      const isPublished =
        req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : notice.is_published;
      const now = new Date().toISOString();
      const publishedAt =
        isPublished && !notice.published_at ? now : notice.published_at;

      getDb()
        .prepare(
          `UPDATE notices SET title = ?, content = ?, is_published = ?, published_at = ?, updated_at = ? WHERE id = ?`
        )
        .run(title, content, isPublished ? 1 : 0, publishedAt, now, notice.id);

      const updated = getNoticeById(notice.id);
      res.json(updated);
    } catch (error) {
      console.error('Update notice error:', error);
      res.status(500).json({ error: 'Failed to update notice' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// DELETE /api/notices/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', validateParams(uuidParamSchema), async (req, res) => {
  try {
    const notice = getNoticeById(req.params.id);
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }
    if (notice.author_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this notice' });
    }

    getDb().prepare(`DELETE FROM notices WHERE id = ?`).run(notice.id);
    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ error: 'Failed to delete notice' });
  }
});

export { router as noticeRouter };
