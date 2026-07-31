import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { env } from '../config/env';
import {
  createInterpretProxySession,
  interpretModeForLanguage,
  isOpenAiConfigured,
  resolveTranslateModel,
  resolveVoiceAgentModel,
  supportedInterpretLanguages,
  toLanguageName,
} from '../services/openaiLive';

const router = Router();

const sessionSchema = z.object({
  targetLanguage: z.enum([
    'ko',
    'en',
    'zh',
    'vi',
    'ja',
    'th',
    'uz',
    'mn',
    'ne',
    'my',
    'km',
    'tl',
  ]),
});

router.get('/status', (_req: Request, res: Response) => {
  res.json({
    configured: isOpenAiConfigured(env),
    model: resolveTranslateModel(env),
    voiceAgentModel: resolveVoiceAgentModel(env),
    supportedLanguages: supportedInterpretLanguages(),
    translationOutputLanguages: supportedInterpretLanguages().filter(
      (code) => interpretModeForLanguage(env, code) === 'translation'
    ),
    mode: 'proxy',
    provider: 'openai',
  });
});

router.post('/session', validateBody(sessionSchema), async (req: Request, res: Response) => {
  try {
    if (!isOpenAiConfigured(env)) {
      res.status(503).json({
        error: 'OpenAI Realtime is not configured. Set OPENAI_API_KEY in .env.local',
      });
      return;
    }

    const { targetLanguage } = req.body as { targetLanguage: string };
    if (!toLanguageName(targetLanguage)) {
      res.status(400).json({ error: `Unsupported target language: ${targetLanguage}` });
      return;
    }

    const session = createInterpretProxySession(env, targetLanguage);
    res.json(session);
  } catch (error) {
    console.error('Interpret session error:', error);
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Failed to create interpret session',
    });
  }
});

export { router as interpretRouter };
