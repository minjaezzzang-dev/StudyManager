import type { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { env } from '../config/env';
import { verifyAccessToken } from '../services/authTokens';
import { findUserById } from '../services/users';
import {
  isOpenAiConfigured,
  resolveTranslateModel,
  resolveVoiceAgentModel,
  toLanguageName,
  toTranslationOutputLanguage,
  usesDedicatedTranslationEndpoint,
} from '../services/openaiLive';
import { logger } from '../utils/logger';

function getQuery(req: IncomingMessage): URLSearchParams {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `http://${host}`);
  return url.searchParams;
}

/** gpt-realtime-translate: continuous translation session (no turn lifecycle). */
function buildTranslationSessionUpdate(outputLanguage: string) {
  return {
    type: 'session.update',
    session: {
      audio: {
        input: {
          transcription: { model: 'gpt-realtime-whisper' },
          noise_reduction: { type: 'near_field' },
        },
        output: { language: outputLanguage },
      },
    },
  };
}

/** Voice-agent fallback for target languages not supported by gpt-realtime-translate output. */
function buildVoiceAgentSessionUpdate(targetLanguageName: string) {
  return {
    type: 'session.update',
    session: {
      type: 'realtime',
      instructions: `You are a real-time interpreter. Listen to the user's speech in any language and immediately translate it into ${targetLanguageName}. Output only the translated speech — no explanations, no meta-commentary. Preserve tone and natural pacing.`,
      output_modalities: ['audio'],
      audio: {
        input: {
          format: { type: 'audio/pcm', rate: 24000 },
          transcription: { model: 'whisper-1' },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
            create_response: true,
            interrupt_response: true,
          },
        },
        output: {
          format: { type: 'audio/pcm', rate: 24000 },
          voice: 'alloy',
        },
      },
    },
  };
}

/** Normalize browser / legacy client events for the active Realtime mode. */
function toOpenAiClientEvent(raw: string, translationMode: boolean): string {
  try {
    const msg = JSON.parse(raw) as Record<string, unknown>;
    const type = msg.type;

    if (typeof type === 'string') {
      if (translationMode && type === 'input_audio_buffer.append' && typeof msg.audio === 'string') {
        return JSON.stringify({
          type: 'session.input_audio_buffer.append',
          audio: msg.audio,
        });
      }
      return raw;
    }

    const realtimeInput = msg.realtimeInput ?? msg.realtime_input;
    const audio =
      (realtimeInput as { audio?: { data?: string } } | undefined)?.audio?.data;
    if (audio) {
      const eventType = translationMode
        ? 'session.input_audio_buffer.append'
        : 'input_audio_buffer.append';
      return JSON.stringify({ type: eventType, audio });
    }
  } catch {
    /* forward raw */
  }
  return raw;
}

function openAiRealtimeUrl(model: string, translationMode: boolean): string {
  const path = translationMode ? 'realtime/translations' : 'realtime';
  return `wss://api.openai.com/v1/${path}?model=${encodeURIComponent(model)}`;
}

/**
 * Browser ↔ EasyKR backend ↔ OpenAI Realtime proxy.
 * Client connects to: /api/interpret/live?token=JWT&targetLanguage=en
 */
export function attachInterpretLiveProxy(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (pathname !== '/api/interpret/live') {
      return;
    }
    wss.handleUpgrade(request, socket, head, (clientWs) => {
      wss.emit('connection', clientWs, request);
    });
  });

  wss.on('connection', async (clientWs, request) => {
    const params = getQuery(request);
    const token = params.get('token') || '';
    const targetLanguage = params.get('targetLanguage') || 'en';

    try {
      if (!isOpenAiConfigured(env)) {
        clientWs.send(JSON.stringify({ error: { message: 'OPENAI_API_KEY is not configured' } }));
        clientWs.close(1011, 'OpenAI not configured');
        return;
      }

      const payload = verifyAccessToken(token, env.JWT_SECRET);
      const user = findUserById(payload.sub);
      if (!user) {
        clientWs.close(1008, 'Unauthorized');
        return;
      }

      const targetLanguageName = toLanguageName(targetLanguage);
      if (!targetLanguageName) {
        clientWs.close(1008, 'Unsupported language');
        return;
      }

      const translateModel = resolveTranslateModel(env);
      const translationMode = usesDedicatedTranslationEndpoint(translateModel, targetLanguage);
      const outputLanguage = toTranslationOutputLanguage(targetLanguage);
      const model = translationMode ? translateModel : resolveVoiceAgentModel(env);

      if (translationMode && !outputLanguage) {
        clientWs.send(
          JSON.stringify({
            error: {
              message: `Target language "${targetLanguage}" is not supported by gpt-realtime-translate output.`,
            },
          })
        );
        clientWs.close(1008, 'Unsupported translation output language');
        return;
      }

      const openaiUrl = openAiRealtimeUrl(model, translationMode);
      const openaiWs = new WebSocket(openaiUrl, {
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
      });

      let sessionReady = false;
      let setupSent = false;
      const pending: string[] = [];

      const closeBoth = (code = 1000, reason = 'closed') => {
        try {
          if (clientWs.readyState === WebSocket.OPEN) clientWs.close(code, reason);
        } catch { /* ignore */ }
        try {
          if (openaiWs.readyState === WebSocket.OPEN) openaiWs.close(code, reason);
        } catch { /* ignore */ }
      };

      openaiWs.on('open', () => {
        const sessionUpdate = translationMode
          ? buildTranslationSessionUpdate(outputLanguage!)
          : buildVoiceAgentSessionUpdate(targetLanguageName);
        openaiWs.send(JSON.stringify(sessionUpdate));
      });

      openaiWs.on('message', (data, isBinary) => {
        const text = isBinary ? (data as Buffer).toString('utf8') : data.toString();
        try {
          const msg = JSON.parse(text) as { type?: string; error?: { message?: string } };
          if (msg.type === 'error') {
            logger.warn({ err: msg.error }, 'OpenAI Realtime error event');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(text);
            }
            return;
          }
          if (msg.type === 'session.updated') {
            sessionReady = true;
            if (!setupSent && clientWs.readyState === WebSocket.OPEN) {
              setupSent = true;
              clientWs.send(JSON.stringify({ setupComplete: {} }));
            }
            for (const queued of pending) {
              if (openaiWs.readyState === WebSocket.OPEN) openaiWs.send(queued);
            }
            pending.length = 0;
            return;
          }
          if (msg.type === 'session.created') {
            return;
          }
        } catch { /* forward raw */ }
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(text);
        }
      });

      openaiWs.on('close', (code, reason) => {
        logger.warn(
          { code, reason: reason.toString(), userId: user.id },
          'OpenAI Realtime interpret WS closed'
        );
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(
            JSON.stringify({ error: { message: reason.toString() || `OpenAI closed (${code})` } })
          );
          clientWs.close(code || 1000, reason.toString().slice(0, 120));
        }
      });

      openaiWs.on('error', (err) => {
        logger.error({ err }, 'OpenAI Realtime interpret WS error');
        closeBoth(1011, 'OpenAI error');
      });

      clientWs.on('message', (data, isBinary) => {
        const raw = isBinary ? (data as Buffer).toString('utf8') : data.toString();
        const outbound = toOpenAiClientEvent(raw, translationMode);
        if (!sessionReady || openaiWs.readyState !== WebSocket.OPEN) {
          pending.push(outbound);
          return;
        }
        openaiWs.send(outbound);
      });

      clientWs.on('close', () => {
        try {
          if (openaiWs.readyState === WebSocket.OPEN) {
            if (translationMode) {
              openaiWs.send(JSON.stringify({ type: 'session.close' }));
            }
            openaiWs.close();
          }
        } catch { /* ignore */ }
      });

      clientWs.on('error', () => {
        closeBoth(1011, 'Client error');
      });
    } catch (error) {
      logger.error({ err: error }, 'Interpret live proxy auth failed');
      try { clientWs.close(1008, 'Unauthorized'); } catch { /* ignore */ }
    }
  });

  logger.info('Interpret Live WebSocket proxy attached at /api/interpret/live (OpenAI Realtime)');
}
