import type { EnvConfig } from '@dahamkee/shared/env';

/** EasyKR language code → Gemini Live Translate BCP-47 */
const BCP47_MAP: Record<string, string> = {
  ko: 'ko',
  en: 'en',
  zh: 'zh-Hans',
  vi: 'vi',
  ja: 'ja',
  th: 'th',
  uz: 'uz',
  mn: 'mn',
  ne: 'ne',
  my: 'my',
  km: 'km',
  tl: 'fil',
};

const SUPPORTED_APP_CODES = Object.keys(BCP47_MAP);

export function isGeminiConfigured(env: EnvConfig): boolean {
  return Boolean(env.GEMINI_API_KEY?.trim());
}

export function toBcp47TargetLanguage(appCode: string): string | null {
  return BCP47_MAP[appCode] ?? null;
}

export function supportedInterpretLanguages(): string[] {
  return [...SUPPORTED_APP_CODES];
}

export interface InterpretSessionInfo {
  model: string;
  /** Browser connects here (backend proxies to Gemini). Append &token=JWT */
  proxyPath: string;
  targetLanguage: string;
  targetLanguageCode: string;
  wsUrl: string;
}

/** Build browser-facing proxy session (no Gemini ephemeral token needed). */
export function createInterpretProxySession(
  env: EnvConfig,
  targetAppLanguage: string
): InterpretSessionInfo {
  if (!isGeminiConfigured(env)) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const targetLanguageCode = toBcp47TargetLanguage(targetAppLanguage);
  if (!targetLanguageCode) {
    throw new Error(`Unsupported target language: ${targetAppLanguage}`);
  }

  const model = env.GEMINI_LIVE_TRANSLATE_MODEL || 'gemini-3.5-live-translate-preview';
  const proxyPath = `/api/interpret/live?targetLanguage=${encodeURIComponent(targetAppLanguage)}`;

  // Prefer BACKEND_URL host; convert http→ws
  const base = (env.BACKEND_URL || 'http://localhost:10000').replace(/^http/, 'ws');
  const wsUrl = `${base}${proxyPath}`;

  return {
    model,
    proxyPath,
    targetLanguage: targetAppLanguage,
    targetLanguageCode,
    wsUrl,
  };
}
