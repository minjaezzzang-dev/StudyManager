// =============================================================
// EasyKR Backend — Persona Chat Routes (SQLite + LLM)
// =============================================================

import { Router } from 'express';
import { randomUUID } from 'crypto';

import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import {
  askPersonaSchema,
  embodyPersonaSchema,
  createPersonaSchema,
  updatePersonaSchema,
  uuidParamSchema,
  paginationSchema,
} from '../routes/schemas';
import { env } from '../config/env';
import { getDb } from '../db/sqlite';
import { chatCompletion } from '../services/llm';
import {
  formatUnitCharacterContext,
  searchUnitCharacterChunks,
} from '../services/unitCharacterRag';
import { getUnitCharacterContext } from '../services/unitCharacterStore';
import {
  buildPersonaSystemPrompt,
  getPersonaExtras,
  scrubScriptLeak,
} from '../services/personaVoice';
import { embodyStoryCharacter, getEmbodiedGreeting } from '../services/unitStories';

const router = Router();

type PersonaRow = {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  language: string;
  avatar_emoji: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  owner_user_id?: string | null;
  greeting?: string | null;
  embody_key?: string | null;
  unit_id?: string | null;
  story_title?: string | null;
  icebreakers_json?: string | null;
};

function parseIcebreakers(row: PersonaRow): string[] {
  if (row.icebreakers_json) {
    try {
      const arr = JSON.parse(row.icebreakers_json);
      if (Array.isArray(arr)) return arr.filter((s) => typeof s === 'string');
    } catch {
      /* ignore */
    }
  }
  return getPersonaExtras(row.id)?.icebreakers || [];
}

function canAccessPersona(row: PersonaRow, userId: string): boolean {
  // Seed personas (no owner) are shared; embodied ones are private
  return !row.owner_user_id || row.owner_user_id === userId;
}

function mapPersona(row: PersonaRow, includePrompt = false) {
  const base = {
    id: row.id,
    name: row.name,
    description: row.description,
    language: row.language,
    avatar_emoji: row.avatar_emoji,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (!includePrompt) return base;
  return { ...base, system_prompt: row.system_prompt };
}

/** Strip leftover assistant-bot phrasing the model sometimes sneaks in. */
function scrubChatbotSmell(text: string, language = 'ko'): string {
  let t = text.trim();
  const pairs: Array<[RegExp, string]> = [
    [/도와드릴게요\.?/g, '같이 보자.'],
    [/도와\s*드릴게요\.?/g, '같이 보자.'],
    [/무엇을 도와드릴까요\??/g, '뭐가 막혀?'],
    [/궁금한\s*점(?:이|을)?\s*물어(?:보|봐)(?:세요|줘요)\.?/g, ''],
    [/질문해\s*주세요\.?/g, ''],
    [/물론이죠\.?/g, '응.'],
    [/알겠습니다\.?/g, '응.'],
    [/이해합니다\.?/g, '그랬구나.'],
    [/좋습니다\.?\s*/g, ''],
    [/첫\s*번째로[,.]?\s*/g, ''],
    [/두\s*번째로[,.]?\s*/g, ''],
    [/세\s*번째로[,.]?\s*/g, ''],
    [/마지막으로[,.]?\s*/g, ''],
    [/요약하면[,.]?\s*/g, ''],
    [/정리하면[,.]?\s*/g, ''],
    [/저는\s*AI.{0,20}/gi, ''],
    [/언어\s*모델/gi, ''],
  ];
  for (const [re, rep] of pairs) t = t.replace(re, rep);
  return scrubScriptLeak(t.replace(/\n{3,}/g, '\n\n').trim(), language);
}

// POST /api/personas/ask
router.post('/ask', validateBody(askPersonaSchema), async (req, res) => {
  try {
    const { personaId, question, language, textbookId, topic, conversationHistory } = req.body as {
      personaId: string;
      question: string;
      language: string;
      textbookId?: string;
      topic?: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };
    const userId = req.user!.id;

    const persona = getDb()
      .prepare(`SELECT * FROM personas WHERE id = ? AND is_active = 1`)
      .get(personaId) as PersonaRow | undefined;

    if (!persona || !canAccessPersona(persona, userId)) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    // 페르소나 대화는 교과 인물 → 한국어 고정 (프로필 preferred_language와 분리)
    const replyLanguage = persona.language || 'ko';
    const storyTitle = persona.story_title || topic || '';
    const unitId = persona.unit_id || undefined;

    const characterContext =
      textbookId && unitId && storyTitle
        ? getUnitCharacterContext(textbookId, unitId, storyTitle, persona.name)
        : undefined;

    const chunks =
      textbookId && unitId
        ? searchUnitCharacterChunks({
            query: [question, storyTitle, persona.name].filter(Boolean).join(' '),
            textbookId,
            unitId,
            storyTitle: storyTitle || undefined,
            characterName: persona.name,
            limit: 2,
          })
        : [];
    const context = formatUnitCharacterContext(chunks);

    const systemPrompt = buildPersonaSystemPrompt({
      personaName: persona.name,
      personaSystemPrompt: persona.system_prompt,
      language: replyLanguage,
      storyTitle: storyTitle || undefined,
      characterContext,
      textbookContext: context || undefined,
      topic: topic || undefined,
    });

    const history = (conversationHistory || []).slice(-6).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: scrubScriptLeak(m.content.slice(0, 500), language),
    }));

    let answer =
      (await chatCompletion(env, {
        tier: 'medium',
        temperature: 0.55,
        maxTokens: 220,
        demoPrefix: '',
        humanLike: false,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          {
            role: 'user',
            content: `(학생 질문) ${question}\n(${persona.name} 말투로, 위 기억·설정 안에서만 짧게 답해.)`,
          },
        ],
      })) || '…잠깐, 말 잇기가 어렵네. 다시 말해줄래?';

    answer = scrubChatbotSmell(answer, language);
    answer = scrubScriptLeak(answer, language);

    // Soft trim if model still dumps a lecture
    const lines = answer.split('\n').filter((l) => l.trim());
    if (lines.length > 5) {
      answer = lines.slice(0, 4).join('\n');
    }
    if (answer.length > 420) {
      answer = `${answer.slice(0, 400).trim()}…`;
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO persona_dialogs (id, user_id, persona_id, user_message, persona_response, language, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, personaId, question, answer, language, now);

    const extras = getPersonaExtras(persona.id);
    res.json({
      answer,
      persona: {
        id: persona.id,
        name: persona.name,
        avatar_emoji: persona.avatar_emoji,
        greeting: persona.greeting || getEmbodiedGreeting(persona.id) || extras?.greeting,
      },
      sources: chunks.map((c) => ({
        textbookId: c.textbookId,
        unitId: c.unitId,
        storyTitle: c.storyTitle,
        characterName: c.characterName,
      })),
    });
  } catch (error) {
    console.error('Persona chat error:', error);
    res.status(500).json({ error: 'Failed to get persona response' });
  }
});

// POST /api/personas/embody — AI-generate system prompt from story character
router.post('/embody', validateBody(embodyPersonaSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const body = req.body as {
      textbookId: string;
      unitId: string;
      story: { title: string; summary?: string; excerpt?: string };
      character: {
        name: string;
        role?: string;
        description?: string;
        avatar_emoji?: string;
      };
      language?: string;
    };

    const embodied = await embodyStoryCharacter({
      userId,
      textbookId: body.textbookId,
      unitId: body.unitId,
      story: {
        title: body.story.title,
        summary: body.story.summary || '',
        excerpt: body.story.excerpt || '',
      },
      character: {
        name: body.character.name,
        role: body.character.role || '등장인물',
        description: body.character.description || '',
        avatar_emoji: body.character.avatar_emoji,
      },
      language: body.language,
    });

    res.status(201).json({
      persona: {
        id: embodied.personaId,
        name: embodied.name,
        description: embodied.description,
        avatar_emoji: embodied.avatar_emoji,
        greeting: embodied.greeting,
        icebreakers: embodied.icebreakers || [],
      },
    });
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
    console.error('Embody persona error:', error);
    res.status(500).json({ error: 'Failed to create persona from character' });
  }
});

// GET /api/personas — seed (shared) + current user's embodied only
router.get('/', validateQuery(paginationSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const pageNum = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    const language = req.query.language ? String(req.query.language) : null;

    const db = getDb();
    const scope = `(owner_user_id IS NULL OR owner_user_id = ?)`;
    let total: number;
    let rows: PersonaRow[];

    if (language) {
      total = (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM personas
             WHERE is_active = 1 AND language = ? AND ${scope}`
          )
          .get(language, userId) as { c: number }
      ).c;
      rows = db
        .prepare(
          `SELECT * FROM personas
           WHERE is_active = 1 AND language = ? AND ${scope}
           ORDER BY created_at ASC LIMIT ? OFFSET ?`
        )
        .all(language, userId, limitNum, offset) as PersonaRow[];
    } else {
      total = (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM personas WHERE is_active = 1 AND ${scope}`
          )
          .get(userId) as { c: number }
      ).c;
      rows = db
        .prepare(
          `SELECT * FROM personas WHERE is_active = 1 AND ${scope}
           ORDER BY created_at ASC LIMIT ? OFFSET ?`
        )
        .all(userId, limitNum, offset) as PersonaRow[];
    }

    res.json({
      personas: rows.map((row) => {
        const extras = getPersonaExtras(row.id);
        return {
          ...mapPersona(row),
          greeting: row.greeting || extras?.greeting || null,
          icebreakers: parseIcebreakers(row),
        };
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('List personas error:', error);
    res.status(500).json({ error: 'Failed to fetch personas' });
  }
});

// GET /api/personas/:id/dialogs
router.get(
  '/:id/dialogs',
  validateParams(uuidParamSchema),
  validateQuery(paginationSchema),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const pageNum = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      const db = getDb();
      const total = (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM persona_dialogs WHERE user_id = ? AND persona_id = ?`
          )
          .get(userId, req.params.id) as { c: number }
      ).c;
      const dialogs = db
        .prepare(
          `SELECT id, user_message, persona_response, language, created_at
           FROM persona_dialogs WHERE user_id = ? AND persona_id = ?
           ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .all(userId, req.params.id, limitNum, offset);

      res.json({
        dialogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    } catch (error) {
      console.error('Get dialogs error:', error);
      res.status(500).json({ error: 'Failed to fetch dialog history' });
    }
  }
);

// GET /api/personas/:id
router.get('/:id', validateParams(uuidParamSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const row = getDb()
      .prepare(`SELECT * FROM personas WHERE id = ? AND is_active = 1`)
      .get(req.params.id) as PersonaRow | undefined;

    if (!row || !canAccessPersona(row, userId)) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    res.json({
      ...mapPersona(row),
      greeting: row.greeting || getEmbodiedGreeting(row.id) || null,
    });
  } catch (error) {
    console.error('Get persona error:', error);
    res.status(500).json({ error: 'Failed to fetch persona' });
  }
});

// Admin create
router.post('/', validateBody(createPersonaSchema), async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const body = req.body as {
      name: string;
      description?: string;
      systemPrompt: string;
      language?: string;
      avatarUrl?: string;
    };
    const id = randomUUID();
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO personas (id, name, description, system_prompt, language, avatar_emoji, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        id,
        body.name,
        body.description || '',
        body.systemPrompt,
        body.language || 'ko',
        '🧑‍🏫',
        now,
        now
      );

    const row = getDb().prepare(`SELECT * FROM personas WHERE id = ?`).get(id) as PersonaRow;
    res.status(201).json(mapPersona(row));
  } catch (error) {
    console.error('Create persona error:', error);
    res.status(500).json({ error: 'Failed to create persona' });
  }
});

// Admin update
router.patch(
  '/:id',
  validateParams(uuidParamSchema),
  validateBody(updatePersonaSchema),
  async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const existing = getDb()
        .prepare(`SELECT * FROM personas WHERE id = ?`)
        .get(req.params.id) as PersonaRow | undefined;
      if (!existing) {
        return res.status(404).json({ error: 'Persona not found' });
      }

      const body = req.body as Partial<{
        name: string;
        description: string;
        systemPrompt: string;
        language: string;
        is_active: boolean;
      }>;
      const now = new Date().toISOString();
      getDb()
        .prepare(
          `UPDATE personas SET
            name = ?, description = ?, system_prompt = ?, language = ?,
            avatar_emoji = ?, is_active = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          body.name ?? existing.name,
          body.description ?? existing.description,
          body.systemPrompt ?? existing.system_prompt,
          body.language ?? existing.language,
          existing.avatar_emoji,
          body.is_active === undefined ? existing.is_active : body.is_active ? 1 : 0,
          now,
          req.params.id
        );

      const row = getDb()
        .prepare(`SELECT * FROM personas WHERE id = ?`)
        .get(req.params.id) as PersonaRow;
      res.json(mapPersona(row));
    } catch (error) {
      console.error('Update persona error:', error);
      res.status(500).json({ error: 'Failed to update persona' });
    }
  }
);

export { router as personaRouter };
