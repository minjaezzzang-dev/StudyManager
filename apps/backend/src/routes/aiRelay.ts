// =============================================================
// EasyKR Backend — AI Relay Routes
// =============================================================
// Secure proxy to AI services (OpenAI, Google Vision) with
// rate limiting, logging, and API key protection
// =============================================================

import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { validateBody, validateParams } from '../middleware/validation';
import {  AuthenticatedRequest } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimiter';
import { env } from '../config/env';
import { recognizeImageText } from '../services/ocr';
import { HUMAN_LIKE_POLICY_COMPACT } from '../services/humanLikePolicy';

const router = Router();

function injectHumanLikePolicy(messages: OpenAI.Chat.ChatCompletionMessageParam[]) {
  const copy = [...messages];
  const i = copy.findIndex((m) => m.role === 'system');
  if (i >= 0) {
    const sys = copy[i];
    if (sys.role === 'system' && typeof sys.content === 'string') {
      if (!sys.content.includes('HUMAN-LIKE OUTPUT POLICY')) {
        copy[i] = {
          role: 'system',
          content: `${sys.content}\n\n${HUMAN_LIKE_POLICY_COMPACT}`,
        };
      }
    }
  } else {
    copy.unshift({
      role: 'system',
      content: HUMAN_LIKE_POLICY_COMPACT,
    });
  }
  return copy;
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────
// POST /api/ai/chat — Chat completions (relay to OpenAI)
// ────────-------------------
router.post('/chat', 
  
  userRateLimiter(50),
  validateBody(z.object({
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant', 'function']),
      content: z.string(),
      name: z.string().optional(),
    })).min(1),
    model: z.enum([
      'gpt-5.6-luna',
      'gpt-5.4-mini', 
      'gpt-5.4-nano',
      'gpt-5-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'GPT-Realtime-2.1-mini',
      'gpt-realtime-translate',
    ]).optional(),
    temperature: z.number().min(0).max(2).default(0.7),
    max_tokens: z.number().int().positive().max(8192).optional(),
    stream: z.boolean().default(false),
    response_format: z.object({ type: z.enum(['text', 'json_object']) }).optional(),
  })),
  async (req: Request, res: Response) => {
    try {
      const { messages, model, temperature, max_tokens, stream, response_format } = req.body;
      const userId = req.user!.id;
      const requestId = uuidv4();
      const policyMessages = injectHumanLikePolicy(
        messages as OpenAI.Chat.ChatCompletionMessageParam[]
      );
      
      // Select model based on complexity if not specified
      const selectedModel = model || selectModel(messages);
      
      console.log(`[AI Relay] Chat request - User: ${userId}, Model: ${selectedModel}, RequestID: ${requestId}`);
      
      if (stream) {
        // Streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        
        const stream = await openai.chat.completions.create({
          model: selectedModel,
          messages: policyMessages,
          temperature: temperature ?? 0.7,
          max_tokens: max_tokens,
          stream: true,
        });
        
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
          
          if (chunk.choices[0]?.finish_reason) {
            res.write(`data: ${JSON.stringify({ done: true, finish_reason: chunk.choices[0].finish_reason })}\n\n`);
          }
        }
        
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
      
      // Non-streaming response
      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: policyMessages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens,
        response_format,
      });
      
      const usage = completion.usage;
      
      // Log usage for monitoring
      console.log(`[AI Relay] Usage - User: ${userId}, Model: ${selectedModel}, Tokens: ${usage?.total_tokens}, RequestID: ${requestId}`);
      
      res.json({
        id: completion.id,
        model: completion.model,
        choices: completion.choices.map(c => ({
          index: c.index,
          message: c.message,
          finish_reason: c.finish_reason,
        })),
        usage: usage ? {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
        } : undefined,
      });
    } catch (error: any) {
      console.error('[AI Relay] Chat error:', error);
      
      if (error.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
      if (error.status === 401) {
        return res.status(500).json({ error: 'AI service authentication failed' });
      }
      
      res.status(500).json({ error: 'AI chat completion failed' });
    }
  }
);

// ────────-------------------
// POST /api/ai/embeddings — Generate embeddings
// ────────-------------------
router.post('/embeddings',
  
  userRateLimiter(100),
  validateBody(z.object({
    input: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
    model: z.enum(['text-embedding-3-small', 'text-embedding-3-large']).default('text-embedding-3-small'),
    dimensions: z.number().int().positive().optional(),
    encoding_format: z.enum(['float', 'base64']).default('float'),
  })),
  async (req: Request, res: Response) => {
    try {
      const { input, model, dimensions, encoding_format } = req.body;
      
      const response = await openai.embeddings.create({
        model,
        input,
        dimensions,
        encoding_format,
      });
      
      res.json({
        object: 'list',
        data: response.data.map((d, i) => ({
          object: 'embedding',
          index: i,
          embedding: d.embedding,
        })),
        model: response.model,
        usage: response.usage,
      });
    } catch (error) {
      console.error('[AI Relay] Embeddings error:', error);
      res.status(500).json({ error: 'Failed to generate embeddings' });
    }
  }
);

// ────────-------------------
// POST /api/ai/speech — Text-to-Speech
// ────────-------------------
router.post('/speech',
  
  userRateLimiter(30),
  validateBody(z.object({
    input: z.string().min(1).max(4096),
    model: z.enum(['tts-1', 'tts-1-hd', 'hd-1']).default('tts-1'),
    voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('nova'),
    response_format: z.enum(['mp3', 'opus', 'aac', 'flac']).default('mp3'),
    speed: z.number().min(0.25).max(4.0).default(1.0),
  })),
  async (req: Request, res: Response) => {
    try {
      const { input, model, voice, response_format, speed } = req.body;
      
      // Map hd-1 to tts-1-hd
      const ttsModel = model === 'hd-1' ? 'tts-1-hd' : model;
      
      const response = await openai.audio.speech.create({
        model: ttsModel,
        input,
        voice,
        response_format,
        speed,
      });
      
      const buffer = Buffer.from(await response.arrayBuffer());
      
      res.setHeader('Content-Type', `audio/${response_format}`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error('[AI Relay] TTS error:', error);
      res.status(500).json({ error: 'Text-to-speech failed' });
    }
  }
);

// ────────-------------------
// POST /api/ai/transcribe — Speech-to-Text (Whisper)
// ────────-------------------
router.post('/transcribe',
  
  userRateLimiter(20),
  validateBody(z.object({
    audioBase64: z.string().min(1, 'Audio data is required'),
    model: z.string().default('whisper-1'),
    language: z.string().optional(),
    prompt: z.string().optional(),
    response_format: z.enum(['json', 'text', 'srt', 'verbose_json', 'vtt']).default('json'),
    temperature: z.number().min(0).max(1).default(0.2),
  })),
  async (req: Request, res: Response) => {
    try {
      const { audioBase64, model, language, prompt, response_format, temperature } = req.body;
      
      // Convert base64 to file
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const file = new File([new Uint8Array(audioBuffer)], 'audio.webm', { type: 'audio/webm' });
      
      const transcription = await openai.audio.transcriptions.create({
        file,
        model,
        language,
        prompt,
        response_format,
        temperature,
      });
      
      const verbose = transcription as OpenAI.Audio.Transcriptions.Transcription & {
        language?: string;
        duration?: number;
      };

      res.json({
        text: transcription.text,
        language: verbose.language,
        duration: verbose.duration,
      });
    } catch (error) {
      console.error('[AI Relay] STT error:', error);
      res.status(500).json({ error: 'Speech-to-text failed' });
    }
  }
);

// ────────-------------------
// POST /api/ai/translate — Real-time translation
// ────────-------------------
router.post('/translate',
  
  userRateLimiter(50),
  validateBody(z.object({
    text: z.string().min(1).max(5000),
    sourceLanguage: z.string().min(2).max(5),
    targetLanguage: z.string().min(2).max(5),
    model: z.enum(['gpt-realtime-translate', 'gpt-5.6-luna', 'gpt-5.4-mini']).default('gpt-realtime-translate'),
  })),
  async (req: Request, res: Response) => {
    try {
      const { text, sourceLanguage, targetLanguage, model } = req.body;
      
      if (sourceLanguage === targetLanguage) {
        return res.json({ translatedText: text });
      }
      
      const sourceLang = getLanguageName(sourceLanguage);
      const targetLang = getLanguageName(targetLanguage);
      
      // No human-like policy on pure translate — it can leak preamble into the text
      const completion = await openai.chat.completions.create({
        model: model === 'gpt-realtime-translate' ? 'gpt-5.4-nano' : model,
        messages: [
          {
            role: 'system',
            content: `Translate from ${sourceLang} to ${targetLang}. Return ONLY the translated text, no explanations.`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });
      
      const translatedText = completion.choices[0]?.message?.content?.trim() || '';
      
      res.json({ translatedText });
    } catch (error) {
      console.error('[AI Relay] Translation error:', error);
      res.status(500).json({ error: 'Translation failed' });
    }
  }
);

// ────────-------------------
// POST /api/ai/vision — Image analysis (GPT-4o Vision)
// ────────-------------------
router.post('/vision',
  
  userRateLimiter(20),
  validateBody(z.object({
    imageBase64: z.string().min(1, 'Image data is required'),
    prompt: z.string().min(1).max(1000).default('Describe this image in detail.'),
    model: z.enum(['gpt-4o', 'gpt-4o-mini']).default('gpt-4o'),
    max_tokens: z.number().int().positive().max(4096).default(1000),
    detail: z.enum(['low', 'high', 'auto']).default('auto'),
  })),
  async (req: Request, res: Response) => {
    try {
      const { imageBase64, prompt, model, max_tokens, detail } = req.body;
      
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail,
                },
              },
            ],
          },
        ],
        max_tokens,
      });
      
      const result = completion.choices[0]?.message?.content || '';
      
      res.json({ result });
    } catch (error) {
      console.error('[AI Relay] Vision error:', error);
      res.status(500).json({ error: 'Image analysis failed' });
    }
  }
);

// ────────-------------------
// POST /api/ai/vision/ocr — OCR via tesseract.js
// ────────-------------------
router.post('/vision/ocr',
  
  userRateLimiter(30),
  validateBody(z.object({
    imageBase64: z.string().min(1, 'Image data is required'),
    languageHints: z.array(z.string()).optional(),
  })),
  async (req: Request, res: Response) => {
    try {
      const { imageBase64, languageHints } = req.body;
      const result = await recognizeImageText({
        imageBase64,
        languageHints: languageHints || ['ko', 'en'],
      });

      res.json({
        text: result.text,
        detectedLanguage: result.detectedLanguage,
      });
    } catch (error) {
      console.error('[AI Relay] OCR error:', error);
      res.status(500).json({ error: 'OCR failed' });
    }
  }
);

// ────────-------------------
// GET /api/ai/models — List available models
// ────────-------------------
router.get('/models',
  
  async (req: Request, res: Response) => {
    try {
      const models = [
        // Chat models
        { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', type: 'chat', tier: 'hard', description: 'Most capable reasoning model' },
        { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', type: 'chat', tier: 'medium', description: 'Balanced capability and cost' },
        { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano', type: 'chat', tier: 'easy', description: 'Fast, efficient for simple tasks' },
        { id: 'gpt-5-nano', name: 'GPT-5 Nano', type: 'chat', tier: 'simple', description: 'Fastest, cheapest for very simple tasks' },
        { id: 'gpt-4o', name: 'GPT-4o', type: 'chat', tier: 'vision', description: 'Multimodal with vision' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', type: 'chat', tier: 'vision', description: 'Lightweight multimodal' },
        
        // Realtime
        { id: 'GPT-Realtime-2.1-mini', name: 'GPT-Realtime 2.1 Mini', type: 'realtime', tier: 'voice', description: 'Real-time voice conversation' },
        { id: 'gpt-realtime-translate', name: 'GPT-Realtime Translate', type: 'realtime', tier: 'translation', description: 'Real-time translation' },
        
        // TTS
        { id: 'tts-1', name: 'TTS-1', type: 'tts', tier: 'standard', description: 'Standard text-to-speech' },
        { id: 'tts-1-hd', name: 'TTS-1 HD', type: 'tts', tier: 'hd', description: 'High-definition text-to-speech' },
        { id: 'hd-1', name: 'HD-1', type: 'tts', tier: 'hd', description: 'Latest HD TTS model (gpt-4o-mini-tts)' },
        
        // STT
        { id: 'whisper-1', name: 'Whisper-1', type: 'stt', tier: 'standard', description: 'Speech-to-text transcription' },
        
        // Embeddings
        { id: 'text-embedding-3-small', name: 'Text Embedding 3 Small', type: 'embedding', dimensions: 1536 },
        { id: 'text-embedding-3-large', name: 'Text Embedding 3 Large', type: 'embedding', dimensions: 3072 },
      ];
      
      res.json({ models });
    } catch (error) {
      console.error('[AI Relay] Models error:', error);
      res.status(500).json({ error: 'Failed to list models' });
    }
  }
);

// ────────-------------------
// Helpers
// ────────-------------------
function selectModel(messages: any[]): string {
  // Simple heuristic: use more powerful model for longer conversations
  const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  const messageCount = messages.length;
  
  if (totalChars > 5000 || messageCount > 10) {
    return 'gpt-5.6-luna';
  }
  if (totalChars > 1000 || messageCount > 5) {
    return 'gpt-5.4-mini';
  }
  return 'gpt-5.4-nano';
}

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    ko: 'Korean', en: 'English', zh: 'Chinese', vi: 'Vietnamese',
    ja: 'Japanese', th: 'Thai', uz: 'Uzbek', mn: 'Mongolian',
    ne: 'Nepali', my: 'Burmese', km: 'Khmer', tl: 'Tagalog',
    auto: 'auto-detect',
  };
  return names[code] || code;
}

export { router as aiRelayRouter };