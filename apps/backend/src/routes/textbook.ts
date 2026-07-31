// =============================================================
// EasyKR Backend — Textbook + RAG search (SQLite FTS5)
// =============================================================

import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { uuidParamSchema } from '../routes/schemas';
import {
  ensureTextbooksIngested,
  getTextbook,
  getTextbookPage,
  listTextbooks,
  searchTextbookChunks,
} from '../services/textbookRag';
import {
  getUnit,
  getUnitPageSample,
  listUnitsForTextbook,
  suggestChatTopicsForUnit,
  suggestTopicsForUnit,
} from '../services/textbookUnits';
import {
  listCharactersForStory,
  listStoriesForUnit,
} from '../services/unitStories';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  textbookId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(10).default(4),
});

const pageQuerySchema = z.object({
  page: z.coerce.number().int().positive(),
});

const suggestTopicsSchema = z.object({
  unitId: z.string().min(1).max(40),
  language: z
    .enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl'])
    .optional(),
  count: z.number().int().min(3).max(6).optional(),
  /** debate = 찬반 토론, chat = 페르소나/토의 대화 주제 */
  mode: z.enum(['debate', 'chat']).optional().default('debate'),
});

const storyBodySchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().max(400).optional().default(''),
  excerpt: z.string().max(2000).optional().default(''),
});

const storyCharactersSchema = z.object({
  unitId: z.string().min(1).max(40),
  story: storyBodySchema,
});

// GET /api/textbooks/search — must be before /:id
router.get('/search', validateQuery(searchQuerySchema), (req, res) => {
  try {
    ensureTextbooksIngested();
    const { q, textbookId, limit } = req.query as unknown as {
      q: string;
      textbookId?: string;
      limit: number;
    };
    const chunks = searchTextbookChunks({
      query: q,
      textbookId: textbookId || null,
      limit,
    });
    res.json({ chunks, count: chunks.length });
  } catch (error) {
    console.error('Textbook search error:', error);
    res.status(500).json({ error: 'Failed to search textbooks' });
  }
});

// GET /api/textbooks
router.get('/', (_req, res) => {
  try {
    ensureTextbooksIngested();
    const textbooks = listTextbooks();
    res.json({ textbooks });
  } catch (error) {
    console.error('List textbooks error:', error);
    res.status(500).json({ error: 'Failed to list textbooks' });
  }
});

// GET /api/textbooks/:id/units
router.get('/:id/units', validateParams(uuidParamSchema), (req, res) => {
  try {
    ensureTextbooksIngested();
    const textbook = getTextbook(req.params.id);
    if (!textbook) {
      return res.status(404).json({ error: 'Textbook not found' });
    }
    const units = listUnitsForTextbook(req.params.id);
    res.json({ textbookId: req.params.id, title: textbook.title, units });
  } catch (error) {
    console.error('List units error:', error);
    res.status(500).json({ error: 'Failed to list units' });
  }
});

// GET /api/textbooks/:id/units/:unitId — unit meta + short preview
router.get(
  '/:id/units/:unitId',
  validateParams(
    z.object({
      id: z.string().uuid('Invalid ID'),
      unitId: z.string().min(1).max(40),
    })
  ),
  (req, res) => {
    try {
      ensureTextbooksIngested();
      const unit = getUnit(req.params.id, req.params.unitId);
      if (!unit) {
        return res.status(404).json({ error: 'Unit not found' });
      }
      const preview = getUnitPageSample(req.params.id, unit, 800);
      res.json({ textbookId: req.params.id, unit, preview });
    } catch (error) {
      console.error('Get unit error:', error);
      res.status(500).json({ error: 'Failed to fetch unit' });
    }
  }
);

// POST /api/textbooks/:id/units/:unitId/stories — extract stories from unit
router.post(
  '/:id/units/:unitId/stories',
  validateParams(
    z.object({
      id: z.string().uuid('Invalid ID'),
      unitId: z.string().min(1).max(40),
    })
  ),
  async (req, res) => {
    try {
      ensureTextbooksIngested();
      if (!getTextbook(req.params.id)) {
        return res.status(404).json({ error: 'Textbook not found' });
      }
      const result = await listStoriesForUnit({
        textbookId: req.params.id,
        unitId: req.params.unitId,
      });
      res.json({
        textbookId: req.params.id,
        unit: result.unit,
        stories: result.stories,
        preview: result.preview,
      });
    } catch (error: unknown) {
      if ((error as { status?: number })?.status === 404) {
        return res.status(404).json({ error: 'Unit not found' });
      }
      console.error('List stories error:', error);
      res.status(500).json({ error: 'Failed to extract stories' });
    }
  }
);

// POST /api/textbooks/:id/story-characters — characters in a story
router.post(
  '/:id/story-characters',
  validateParams(uuidParamSchema),
  validateBody(storyCharactersSchema),
  async (req, res) => {
    try {
      ensureTextbooksIngested();
      if (!getTextbook(req.params.id)) {
        return res.status(404).json({ error: 'Textbook not found' });
      }
      const { unitId, story } = req.body as {
        unitId: string;
        story: { title: string; summary?: string; excerpt?: string };
      };
      const result = await listCharactersForStory({
        textbookId: req.params.id,
        unitId,
        story: {
          title: story.title,
          summary: story.summary || '',
          excerpt: story.excerpt || '',
        },
      });
      res.json({ textbookId: req.params.id, unitId, characters: result.characters });
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status === 404) {
        return res.status(404).json({ error: 'Unit not found' });
      }
      if (status === 400) {
        return res.status(400).json({
          error: (error as Error).message || 'Story not found in textbook',
        });
      }
      console.error('List characters error:', error);
      res.status(500).json({ error: 'Failed to extract characters' });
    }
  }
);

// POST /api/textbooks/:id/suggest-topics
router.post(
  '/:id/suggest-topics',
  validateParams(uuidParamSchema),
  validateBody(suggestTopicsSchema),
  async (req, res) => {
    try {
      ensureTextbooksIngested();
      const textbook = getTextbook(req.params.id);
      if (!textbook) {
        return res.status(404).json({ error: 'Textbook not found' });
      }
      const { unitId, language, count, mode } = req.body as {
        unitId: string;
        language?: string;
        count?: number;
        mode?: 'debate' | 'chat';
      };
      const result =
        mode === 'chat'
          ? await suggestChatTopicsForUnit({
              textbookId: req.params.id,
              unitId,
              language,
              count,
            })
          : await suggestTopicsForUnit({
              textbookId: req.params.id,
              unitId,
              language,
              count,
            });
      res.json({
        textbookId: req.params.id,
        textbookTitle: textbook.title,
        mode: mode || 'debate',
        unit: result.unit,
        topics: result.topics,
        preview: result.samplePreview,
      });
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status === 404) {
        return res.status(404).json({ error: 'Unit not found' });
      }
      console.error('Suggest topics error:', error);
      res.status(500).json({ error: 'Failed to suggest topics' });
    }
  }
);

// GET /api/textbooks/:id/pages?page=
router.get(
  '/:id/pages',
  validateParams(uuidParamSchema),
  validateQuery(pageQuerySchema),
  (req, res) => {
    try {
      ensureTextbooksIngested();
      const page = Number(req.query.page);
      const data = getTextbookPage(req.params.id, page);
      if (!data) {
        return res.status(404).json({ error: 'Page not found' });
      }
      const preview =
        data.content.length > 4000 ? `${data.content.slice(0, 4000)}…` : data.content;
      res.json({
        textbookId: data.textbookId,
        pageNumber: data.pageNumber,
        content: preview,
        chunkCount: data.chunks.length,
      });
    } catch (error) {
      console.error('Get textbook page error:', error);
      res.status(500).json({ error: 'Failed to fetch textbook page' });
    }
  }
);

// GET /api/textbooks/:id
router.get('/:id', validateParams(uuidParamSchema), (req, res) => {
  try {
    ensureTextbooksIngested();
    const textbook = getTextbook(req.params.id);
    if (!textbook) {
      return res.status(404).json({ error: 'Textbook not found' });
    }
    res.json(textbook);
  } catch (error) {
    console.error('Get textbook error:', error);
    res.status(500).json({ error: 'Failed to fetch textbook' });
  }
});

export { router as textbookRouter };
