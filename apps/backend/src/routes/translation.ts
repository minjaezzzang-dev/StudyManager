// =============================================================
// EasyKR Backend — Translation Routes (SQLite + OpenAI/demo)
// =============================================================

import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

import {
  translateTextSchema,
  translateVoiceSchema,
  translateCameraSchema,
  translateDocumentSchema,
} from '../routes/schemas';
import { validateBody } from '../middleware/validation';
import { env } from '../config/env';
import { recognizeImageText } from '../services/ocr';
import { translateTextContent } from '../services/translate';
import { listTranslations, saveTranslation } from '../services/records';
import { isDemoLlm } from '../services/llm';

const router = Router();

// ─────────────────────────────────────────────────────────────
// POST /api/translations/text
// ─────────────────────────────────────────────────────────────
router.post('/text', validateBody(translateTextSchema), async (req: Request, res: Response) => {
  try {
    const { text, sourceLanguage, targetLanguage, mode, translatedText: provided } = req.body;
    const userId = req.user!.id;

    const translatedText =
      typeof provided === 'string' && provided.trim()
        ? provided.trim()
        : await translateTextContent(env, {
            text,
            sourceLanguage,
            targetLanguage,
          });

    saveTranslation({
      userId,
      sourceText: text,
      targetText: translatedText,
      sourceLanguage,
      targetLanguage,
      mode: mode || 'text',
    });

    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/translations/voice
// ─────────────────────────────────────────────────────────────
router.post('/voice', validateBody(translateVoiceSchema), async (req: Request, res: Response) => {
  try {
    const { audioBase64, sourceLanguage, targetLanguage } = req.body;
    const userId = req.user!.id;

    if (sourceLanguage === targetLanguage) {
      return res.status(400).json({ error: 'Source and target languages must be different' });
    }

    // Voice STT/TTS still need OpenAI audio models; NIM covers text translate only.
    if (isDemoLlm(env) || !env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes('test')) {
      const sourceText = '[demo speech transcript]';
      const targetText = await translateTextContent(env, {
        text: sourceText,
        sourceLanguage,
        targetLanguage,
      });
      saveTranslation({
        userId,
        sourceText,
        targetText,
        sourceLanguage,
        targetLanguage,
        mode: 'voice',
      });
      return res.json({
        sourceText,
        targetText,
        audioUrl: null,
        audioBase64: null,
        demo: true,
      });
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    const sttResponse = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
      model: env.OPENAI_MODEL_STT,
      language: sourceLanguage,
    });

    const sourceText = sttResponse.text?.trim() || '';
    if (!sourceText) {
      return res.status(400).json({ error: 'No speech detected' });
    }

    const targetText = await translateTextContent(env, {
      text: sourceText,
      sourceLanguage,
      targetLanguage,
    });

    const ttsResponse = await openai.audio.speech.create({
      model: env.OPENAI_MODEL_TTS_HD,
      input: targetText,
      voice: 'nova',
      response_format: 'mp3',
    });

    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBase64Result = Buffer.from(audioArrayBuffer).toString('base64');

    saveTranslation({
      userId,
      sourceText,
      targetText,
      sourceLanguage,
      targetLanguage,
      mode: 'voice',
    });

    res.json({
      sourceText,
      targetText,
      audioUrl: null,
      audioBase64: audioBase64Result,
    });
  } catch (error) {
    console.error('Voice translation error:', error);
    res.status(500).json({ error: 'Voice translation failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/translations/camera
// ─────────────────────────────────────────────────────────────
router.post('/camera', validateBody(translateCameraSchema), async (req: Request, res: Response) => {
  try {
    const { imageBase64, sourceLanguage, targetLanguage } = req.body;
    const userId = req.user!.id;

    if (sourceLanguage === targetLanguage) {
      return res.status(400).json({ error: 'Source and target languages must be different' });
    }

    const ocr = await recognizeImageText({
      imageBase64,
      languageHints:
        sourceLanguage === 'auto'
          ? ['ko', 'en', targetLanguage]
          : [sourceLanguage, targetLanguage, 'en'],
    });
    const fullText = ocr.text;

    if (!fullText.trim()) {
      return res.status(400).json({ error: 'No text detected in image' });
    }

    const translatedText = await translateTextContent(env, {
      text: fullText,
      sourceLanguage: sourceLanguage === 'auto' ? 'auto' : sourceLanguage,
      targetLanguage,
    });

    saveTranslation({
      userId,
      sourceText: fullText,
      targetText: translatedText,
      sourceLanguage,
      targetLanguage,
      mode: 'camera',
    });

    res.json({
      sourceText: fullText,
      translatedText,
    });
  } catch (error) {
    console.error('Camera translation error:', error);
    res.status(500).json({ error: 'Camera translation failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/translations/document — not available without RAG store
// ─────────────────────────────────────────────────────────────
router.post('/document', validateBody(translateDocumentSchema), async (_req, res) => {
  res.status(501).json({ error: 'Document translation requires textbook storage (not available locally yet)' });
});

// ─────────────────────────────────────────────────────────────
// GET /api/translations/history
// ─────────────────────────────────────────────────────────────
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const pageNum = parseInt(String(req.query.page || '1'), 10);
    const limitNum = parseInt(String(req.query.limit || '20'), 10);
    const offset = (pageNum - 1) * limitNum;

    const rows = listTranslations(userId, { limit: limitNum, offset });

    res.json({
      translations: rows.map((r) => ({
        id: r.id,
        source_text: r.source_text,
        target_text: r.target_text,
        result_text: r.target_text,
        source_language: r.source_language,
        target_language: r.target_language,
        mode: r.mode,
        type: r.mode,
        created_at: r.created_at,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: rows.length,
        totalPages: pageNum,
      },
    });
  } catch (error) {
    console.error('Translation history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export { router as translationRouter };
