import type { EnvConfig } from '@dahamkee/shared/env';

/** EasyKR language code → BCP-47 display name for OpenAI session instructions */
const LANGUAGE_NAMES: Record<string, string> = {
  ko: 'Korean',
  en: 'English',
  zh: 'Chinese (Simplified)',
  vi: 'Vietnamese',
  ja: 'Japanese',
  th: 'Thai',
  uz: 'Uzbek',
  mn: 'Mongolian',
  ne: 'Nepali',
  my: 'Burmese',
  km: 'Khmer',
  tl: 'Filipino (Tagalog)',
};

const SUPPORTED_APP_CODES = Object.keys(LANGUAGE_NAMES);

/** Output languages supported by gpt-realtime-translate (ISO 639-1). */
const TRANSLATION_OUTPUT: Record<string, string> = {
  en: 'en',
  ko: 'ko',
  zh: 'zh',
  vi: 'vi',
  ja: 'ja',
  // Also supported by the model but not primary EasyKR targets: es, pt, fr, ru, de, hi, id, it
};

export function isOpenAiConfigured(env: EnvConfig): boolean {
  return Boolean(env.OPENAI_API_KEY?.trim());
}

export function toLanguageName(appCode: string): string | null {
  return LANGUAGE_NAMES[appCode] ?? null;
}

export function toTranslationOutputLanguage(appCode: string): string | null {
  return TRANSLATION_OUTPUT[appCode] ?? null;
}

export function usesDedicatedTranslationEndpoint(model: string, targetAppLanguage: string): boolean {
  return model.includes('translate') && Boolean(TRANSLATION_OUTPUT[targetAppLanguage]);
}

/** Normalize env model names (e.g. GPT-Realtime-2.1-mini → gpt-realtime-2.1-mini). */
export function resolveVoiceAgentModel(env: EnvConfig): string {
  const raw = env.OPENAI_MODEL_REALTIME_VOICE?.trim() || 'gpt-realtime-2.1-mini';
  return raw.toLowerCase();
}

export function resolveTranslateModel(env: EnvConfig): string {
  const raw = env.OPENAI_MODEL_REALTIME_TRANSLATE?.trim() || 'gpt-realtime-translate';
  return raw.toLowerCase();
}

export function interpretModeForLanguage(
  env: EnvConfig,
  targetAppLanguage: string
): 'translation' | 'voice-agent' {
  return usesDedicatedTranslationEndpoint(resolveTranslateModel(env), targetAppLanguage)
    ? 'translation'
    : 'voice-agent';
}

export function supportedInterpretLanguages(): string[] {
  return [...SUPPORTED_APP_CODES];
}

export interface InterpretSessionInfo {
  model: string;
  proxyPath: string;
  targetLanguage: string;
  targetLanguageName: string;
  wsUrl: string;
}

/** Build browser-facing proxy session info for OpenAI Realtime. */
export function createInterpretProxySession(
  env: EnvConfig,
  targetAppLanguage: string
): InterpretSessionInfo {
  if (!isOpenAiConfigured(env)) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const targetLanguageName = toLanguageName(targetAppLanguage);
  if (!targetLanguageName) {
    throw new Error(`Unsupported target language: ${targetAppLanguage}`);
  }

  const model = resolveTranslateModel(env);
  const proxyPath = `/api/interpret/live?targetLanguage=${encodeURIComponent(targetAppLanguage)}`;
  const base = (env.BACKEND_URL || 'http://localhost:10000').replace(/^http/, 'ws');
  const wsUrl = `${base}${proxyPath}`;

  return {
    model,
    proxyPath,
    targetLanguage: targetAppLanguage,
    targetLanguageName,
    wsUrl,
  };
}
