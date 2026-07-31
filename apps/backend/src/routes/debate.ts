// =============================================================
// EasyKR Backend — Debate Routes (SQLite + LLM)
// =============================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';

import {
  startDebateSchema,
  continueDebateSchema,
  paginationSchema,
} from '../routes/schemas';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { getDb } from '../db/sqlite';
import { env } from '../config/env';
import { chatCompletion } from '../services/llm';
import {
  formatChunksAsContext,
  searchTextbookChunks,
} from '../services/textbookRag';

const router = Router();

const STANCE_KO = { pro: '찬성', con: '반대' } as const;
const LANGUAGE_NAMES: Record<string, string> = {
  ko: 'Korean',
  en: 'English',
  zh: 'Chinese',
  vi: 'Vietnamese',
  ja: 'Japanese',
  th: 'Thai',
  uz: 'Uzbek',
  mn: 'Mongolian',
  ne: 'Nepali',
  my: 'Burmese',
  km: 'Khmer',
  tl: 'Tagalog',
};

type ChatMsg = { role: 'user' | 'assistant'; content: string };

function buildSystemPrompt(
  topic: string,
  userStance: string,
  language: string,
  context = ''
): string {
  const aiStance = userStance === 'con' ? 'pro' : 'con';
  const aiStanceText = STANCE_KO[aiStance];
  const userStanceText = STANCE_KO[userStance as keyof typeof STANCE_KO] || userStance;
  const langName = LANGUAGE_NAMES[language] || language;
  return `Debate partner in ${langName}. Topic: "${topic}". The user's stance: ${userStanceText}. Your mandatory side: ${aiStanceText} (you MUST strictly defend ${aiStanceText} and oppose the student's ${userStanceText} view).
Short, natural replies. One point at a time. No AI filler.
${context ? `\nTextbook notes:\n${context.slice(0, 800)}` : ''}`;
}


function ragContext(query: string, textbookId?: string | null): string {
  const chunks = searchTextbookChunks({
    query,
    textbookId: textbookId || null,
    limit: 4,
  });
  return formatChunksAsContext(chunks);
}

// POST /api/debates — Start a new debate
router.post('/', validateBody(startDebateSchema), async (req: Request, res: Response) => {
  try {
    const { topic, stance, language, textbookId } = req.body as {
      topic: string;
      stance: 'pro' | 'con';
      language: string;
      textbookId?: string;
    };
    const userId = req.user!.id;
    const userOpens =
      stance === 'pro'
        ? `토론을 시작하겠습니다. 저는 "${topic}"에 찬성합니다. 첫 주장을 부탁드립니다.`
        : `토론을 시작하겠습니다. 저는 "${topic}"에 반대합니다. 첫 주장을 부탁드립니다.`;

    const context = ragContext(topic, textbookId);
    const aiResponse = await chatCompletion(env, {
      tier: 'hard',
      temperature: 0.7,
      maxTokens: 1000,
      demoPrefix: '[demo-debate]',
      messages: [
        { role: 'system', content: buildSystemPrompt(topic, stance, language, context) },
        { role: 'user', content: userOpens },
      ],
    });

    const messages: ChatMsg[] = [
      { role: 'user', content: userOpens },
      { role: 'assistant', content: aiResponse || '응답을 생성하지 못했습니다.' },
    ];

    const id = randomUUID();
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO debates (id, user_id, topic, stance, language, messages, is_complete, textbook_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
      )
      .run(
        id,
        userId,
        topic,
        stance,
        language,
        JSON.stringify(messages),
        textbookId || null,
        now,
        now
      );

    res.status(201).json({
      recordId: id,
      response: aiResponse,
      feedback: '',
      isComplete: false,
      messages,
    });
  } catch (error) {
    console.error('Start debate error:', error);
    res.status(500).json({ error: 'Failed to start debate' });
  }
});

// GET /api/debates/history — must be before /:id
router.get('/history', validateQuery(paginationSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const pageNum = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const db = getDb();
    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM debates WHERE user_id = ?`).get(userId) as { c: number }
    ).c;
    const rows = db
      .prepare(
        `SELECT id, topic, stance, language, is_complete, feedback, created_at, updated_at
         FROM debates WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(userId, limitNum, offset);

    res.json({
      debates: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Debate history error:', error);
    res.status(500).json({ error: 'Failed to fetch debate history' });
  }
});

// POST /api/debates/:id/turn
router.post(
  '/:id/turn',
  validateParams(z.object({ id: z.string().uuid() })),
  validateBody(continueDebateSchema),
  async (req, res) => {
    try {
      const { message, conversationHistory } = req.body as {
        message: string;
        conversationHistory: ChatMsg[];
      };
      const userId = req.user!.id;
      const recordId = req.params.id;

      const row = getDb()
        .prepare(`SELECT * FROM debates WHERE id = ? AND user_id = ?`)
        .get(recordId, userId) as
        | {
            id: string;
            topic: string;
            stance: string;
            language: string;
            messages: string;
            is_complete: number;
            textbook_id: string | null;
          }
        | undefined;

      if (!row) {
        return res.status(404).json({ error: 'Debate not found' });
      }
      if (row.is_complete) {
        return res.status(400).json({ error: 'Debate already completed' });
      }

      const history =
        Array.isArray(conversationHistory) && conversationHistory.length > 0
          ? conversationHistory
          : (JSON.parse(row.messages || '[]') as ChatMsg[]);

      const context = ragContext(`${row.topic} ${message}`, row.textbook_id);
      const aiResponse = await chatCompletion(env, {
        tier: 'hard',
        temperature: 0.7,
        maxTokens: 1000,
        demoPrefix: '[demo-debate]',
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(row.topic, row.stance, row.language, context),
          },
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
      });

      const nextMessages: ChatMsg[] = [
        ...history,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse || '응답을 생성하지 못했습니다.' },
      ];

      const isComplete = nextMessages.filter((m) => m.role === 'user').length >= 5;
      let feedback = '';
      if (isComplete) {
        feedback = await chatCompletion(env, {
          tier: 'medium',
          temperature: 0.5,
          maxTokens: 600,
          demoPrefix: '[demo-feedback]',
          messages: [
            {
              role: 'system',
              content: `Debate coach writing brief notes in ${LANGUAGE_NAMES[row.language] || row.language}.
Three short lines only: (1) what worked (2) one fix (3) one push forward.
Plain language. No AI pep talk. No "훌륭한 토론이었습니다".`,
            },
            {
              role: 'user',
              content: `Topic: ${row.topic}\nStudent stance: ${row.stance}\nTranscript:\n${nextMessages
                .map((m) => `${m.role}: ${m.content}`)
                .join('\n')}`,
            },
          ],
        });
      }

      const now = new Date().toISOString();
      getDb()
        .prepare(
          `UPDATE debates SET messages = ?, is_complete = ?, feedback = ?, updated_at = ? WHERE id = ?`
        )
        .run(JSON.stringify(nextMessages), isComplete ? 1 : 0, feedback || null, now, recordId);

      res.json({
        response: aiResponse,
        feedback,
        isComplete,
        messages: nextMessages,
      });
    } catch (error) {
      console.error('Debate turn error:', error);
      res.status(500).json({ error: 'Failed to continue debate' });
    }
  }
);

export { router as debateRouter };
