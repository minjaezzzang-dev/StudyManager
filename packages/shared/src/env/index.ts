import { z } from 'zod';

/**
 * Environment Variable Validation Schema
 * 
 * This schema validates all required environment variables
 * for the EasyKR application across all environments.
 */

// ─────────────────────────────────────────────────────────────
// Application Metadata
// ─────────────────────────────────────────────────────────────
export const appMetaSchema = z.object({
  APP_NAME: z.string().default('EasyKR'),
  APP_VERSION: z.string().default('1.0.0'),
  APP_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_TELEMETRY_DISABLED: z.string().optional(),
  DEBUG: z.string().optional(),
  VERBOSE_LOGGING: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────
// Supabase Configuration
// ─────────────────────────────────────────────────────────────
export const supabaseSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(10, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().min(32, 'SUPABASE_JWT_SECRET must be at least 32 characters'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL').optional(),
  DIRECT_URL: z.string().url('DIRECT_URL must be a valid PostgreSQL URL').optional(),
});

// ─────────────────────────────────────────────────────────────
// OpenAI Configuration
// ─────────────────────────────────────────────────────────────
export const openaiSchema = z.object({
  OPENAI_API_KEY: z.string().min(20, 'OPENAI_API_KEY is required'),
  OPENAI_ORG_ID: z.string().optional(),

  // NVIDIA NIM (OpenAI-compatible). When set, translation uses NIM instead of OpenAI.
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_API_BASE_URL: z
    .string()
    .url()
    .default('https://integrate.api.nvidia.com/v1'),
  NIM_MODEL: z.string().default('meta/llama-3.1-8b-instruct'),
  NIM_MODEL_EASY: z.string().optional(),
  NIM_MODEL_MEDIUM: z.string().optional(),
  NIM_MODEL_HARD: z.string().optional(),

  // Google Gemini (Live Translate)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_LIVE_TRANSLATE_MODEL: z
    .string()
    .default('gemini-3.5-live-translate-preview'),

  // Model Selection by Task Complexity
  OPENAI_MODEL_HARD: z.string().default('gpt-5.6-luna'),
  OPENAI_MODEL_HARD_MAX_TOKENS: z.coerce.number().default(8192),
  OPENAI_MODEL_HARD_TEMPERATURE: z.coerce.number().default(0.7),

  OPENAI_MODEL_MEDIUM: z.string().default('gpt-5.4-mini'),
  OPENAI_MODEL_MEDIUM_MAX_TOKENS: z.coerce.number().default(4096),
  OPENAI_MODEL_MEDIUM_TEMPERATURE: z.coerce.number().default(0.5),

  OPENAI_MODEL_EASY: z.string().default('gpt-5.4-nano'),
  OPENAI_MODEL_EASY_MAX_TOKENS: z.coerce.number().default(2048),
  OPENAI_MODEL_EASY_TEMPERATURE: z.coerce.number().default(0.3),

  OPENAI_MODEL_SIMPLE: z.string().default('gpt-5-nano'),
  OPENAI_MODEL_SIMPLE_MAX_TOKENS: z.coerce.number().default(1024),
  OPENAI_MODEL_SIMPLE_TEMPERATURE: z.coerce.number().default(0.2),

  // Specialized Models
  OPENAI_MODEL_REALTIME_VOICE: z.string().default('GPT-Realtime-2.1-mini'),
  OPENAI_MODEL_REALTIME_VOICE_VOICE: z.string().default('alloy'),

  OPENAI_MODEL_REALTIME_TRANSLATE: z.string().default('gpt-realtime-translate'),

  OPENAI_MODEL_TTS_HD: z.string().default('hd-1'),
  OPENAI_TTS_HD_VOICES: z.string().default('alloy,echo,fable,onyx,nova,shimmer'),

  OPENAI_MODEL_TTS_STANDARD: z.string().default('tts-1'),
  OPENAI_TTS_STANDARD_VOICES: z.string().default('alloy,echo,fable,onyx,nova,shimmer'),

  OPENAI_MODEL_STT: z.string().default('whisper-1'),
  OPENAI_STT_LANGUAGES: z.string().default('ko,en,zh,vi,ja,th,uz,mn,ne,my,km,tl'),

  OPENAI_MODEL_EMBEDDING_SMALL: z.string().default('text-embedding-3-small'),
  OPENAI_MODEL_EMBEDDING_LARGE: z.string().default('text-embedding-3-large'),
  OPENAI_EMBEDDING_DIMENSIONS_SMALL: z.coerce.number().default(1536),
  OPENAI_EMBEDDING_DIMENSIONS_LARGE: z.coerce.number().default(3072),

  OPENAI_MODEL_VISION: z.string().default('gpt-4o'),
  OPENAI_MODEL_VISION_MINI: z.string().default('gpt-4o-mini'),
});

// ─────────────────────────────────────────────────────────────
// Google Cloud Vision (OCR)
// ─────────────────────────────────────────────────────────────
export const googleVisionSchema = z.object({
  // Optional — OCR uses tesseract.js; kept for legacy Vision API relays
  GOOGLE_VISION_API_KEY: z.string().optional(),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────
// OAuth Providers
// ────────────────────────-------------------
export const oauthSchema = z.object({
  // Google OAuth 2.0 — optional when social login not configured
  GOOGLE_CLIENT_ID: z.string().default('oauth-disabled-google-client-id'),
  GOOGLE_CLIENT_SECRET: z.string().default('oauth-disabled-google-secret'),
  GOOGLE_REDIRECT_URI: z.string().url().default('http://127.0.0.1:10000/api/auth/oauth/google/callback'),
  GOOGLE_IOS_CLIENT_ID: z.string().optional(),
  GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),

  // Apple Sign In
  APPLE_CLIENT_ID: z.string().default('com.dahamkee.easykr'),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
  APPLE_REDIRECT_URI: z.string().url().default('http://127.0.0.1:10000/api/auth/oauth/apple/callback'),

  // X (Twitter) OAuth 2.0
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  X_REDIRECT_URI: z.string().url().optional(),
  X_OAUTH2_SCOPES: z.string().default('tweet.read,users.read,offline.access'),

  // Facebook Login
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  FACEBOOK_REDIRECT_URI: z.string().url().optional(),

  // Kakao Login
  KAKAO_CLIENT_ID: z.string().optional(),
  KAKAO_CLIENT_SECRET: z.string().optional(),
  KAKAO_REDIRECT_URI: z.string().url().optional(),
  KAKAO_ADMIN_KEY: z.string().optional(),
});

// ────────-------------------
// Email Service (Choose One)
// ────────-------------------
export const emailSchema = z.object({
  // Self-hosted / local SMTP (Mailpit by default)
  SMTP_HOST: z.string().default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_SECURE: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().default('noreply@easykr.local'),
  SMTP_FROM_NAME: z.string().default('EasyKR'),

  // Legacy optional providers (unused by OTP flow)
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  SENDGRID_FROM_NAME: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  RESEND_FROM_NAME: z.string().optional(),
  AWS_REGION: z.string().default('ap-northeast-2'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  SES_FROM_EMAIL: z.string().email().optional(),
  SES_FROM_NAME: z.string().optional(),

  // Email Verification Settings
  EMAIL_VERIFICATION_OTP_LENGTH: z.coerce.number().default(6),
  EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES: z.coerce.number().default(10),
  EMAIL_VERIFICATION_MAGIC_LINK_EXPIRY_HOURS: z.coerce.number().default(24),
  EMAIL_VERIFICATION_RATE_LIMIT_PER_HOUR: z.coerce.number().default(5),
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
  EMAIL_VERIFICATION_MAX_ATTEMPTS: z.coerce.number().default(5),
});

// ────────-------------------
// Backend Server
// ────────-------------------
export const backendSchema = z.object({
  BACKEND_PORT: z.coerce.number().default(10000),
  BACKEND_HOST: z.string().default('0.0.0.0'),
  BACKEND_URL: z.string().url('BACKEND_URL must be a valid URL'),
  BACKEND_CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:19006,exp://localhost:19000'),
  DATA_DIR: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX_REQUESTS: z.coerce.number().default(10),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
});

// ────────-------------------
// Frontend (Next.js)
// ────────-------------------
export const frontendSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://127.0.0.1:3000'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://127.0.0.1:10000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('http://127.0.0.1:54321'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default('supabase-anon-key-placeholder'),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_APPLE_CLIENT_ID: z.string().optional(),

  NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_VOICE_CHAT: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_VISION_OCR: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_REALTIME_TRANSLATE: z.coerce.boolean().default(true),

  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional(),
});

// ────────-------------------
// Mobile (Expo/React Native)
// ────────-------------------
export const mobileSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().default('http://127.0.0.1:10000'),
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().default('http://127.0.0.1:54321'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().default('supabase-anon-key-placeholder'),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_APPLE_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_KAKAO_CLIENT_ID: z.string().optional(),

  EAS_PROJECT_ID: z.string().optional(),
  EXPO_APPLE_TEAM_ID: z.string().optional(),
  EXPO_PUSH_TOKEN: z.string().optional(),
});

// ────────-------------------
// Storage
// ────────-------------------
export const storageSchema = z.object({
  STORAGE_PROVIDER: z.enum(['supabase', 's3']).default('supabase'),
  SUPABASE_STORAGE_URL: z.string().url().optional(),
  SUPABASE_STORAGE_BUCKET_OCR: z.string().default('ocr-images'),
  SUPABASE_STORAGE_BUCKET_TTS: z.string().default('tts-audio'),
  SUPABASE_STORAGE_BUCKET_AVATARS: z.string().default('avatars'),
  SUPABASE_STORAGE_BUCKET_TEXTBOOKS: z.string().default('textbooks'),

  // S3 Compatible (Alternative)
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('auto'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),

  MAX_FILE_SIZE_OCR: z.coerce.number().default(10485760),
  MAX_FILE_SIZE_TTS: z.coerce.number().default(5242880),
  MAX_FILE_SIZE_AVATAR: z.coerce.number().default(2097152),
  MAX_FILE_SIZE_TEXTBOOK: z.coerce.number().default(52428800),
});

// ────────-------------------
// Realtime/WebSocket
// ────────-------------------
export const realtimeSchema = z.object({
  SUPABASE_REALTIME_URL: z.string().optional(),
  REALTIME_MAX_CONNECTIONS: z.coerce.number().default(1000),
  REALTIME_HEARTBEAT_INTERVAL: z.coerce.number().default(30000),
});

// ────────-------------------
// Monitoring & Logging
// ────────-------------------
export const monitoringSchema = z.object({
  LOG_LEVEL: z.enum(['silent', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z.coerce.boolean().default(false),

  SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().default(0.1),
  SENTRY_PROFILES_SAMPLE_RATE: z.coerce.number().default(0.1),

  DD_API_KEY: z.string().optional(),
  DD_APP_KEY: z.string().optional(),
  DD_SITE: z.string().default('datadoghq.com'),
  DD_SERVICE: z.string().default('easykr'),
  DD_ENV: z.string().default('development'),
  DD_VERSION: z.string().default('1.0.0'),
  DD_LOGS_INJECTION: z.coerce.boolean().default(false),
});

// ────────-------------------
// Feature Flags
// ────────-------------------
export const featureFlagsSchema = z.object({
  FF_ENABLE_VR_SUPPORT: z.coerce.boolean().default(false),
  FF_ENABLE_VISIONOS_SUPPORT: z.coerce.boolean().default(false),
  FF_ENABLE_OFFLINE_MODE: z.coerce.boolean().default(false),
  FF_ENABLE_AI_DEBATE: z.coerce.boolean().default(true),
  FF_ENABLE_PERSONA_CHAT: z.coerce.boolean().default(true),
  FF_ENABLE_RAG_TEXTBOOK: z.coerce.boolean().default(true),
  FF_ENABLE_MULTI_LANGUAGE: z.coerce.boolean().default(true),
  FF_ENABLE_VOICE_INTERPRETATION: z.coerce.boolean().default(true),
});

// ────────-------------------
// Development Tools
// ────────-------------------
export const devToolsSchema = z.object({
  ENABLE_SWAGGER_UI: z.coerce.boolean().default(true),
  SWAGGER_PATH: z.string().default('/api/docs'),
  TURBO_TEAM: z.string().optional(),
  TURBO_TOKEN: z.string().optional(),
  PNPM_STORE_PATH: z.string().default('.pnpm-store'),
});

// ────────-------------------
// Test Specific
// ────────-------------------
export const testSchema = z.object({
  TEST_DATABASE_RESET: z.coerce.boolean().default(true),
  TEST_PARALLEL_WORKERS: z.coerce.number().default(4),
  TEST_TIMEOUT_MS: z.coerce.number().default(30000),
  PLAYWRIGHT_BASE_URL: z.string().url().optional(),
  PLAYWRIGHT_API_URL: z.string().url().optional(),
  DETOX_TEST_TIMEOUT: z.coerce.number().default(120000),
});

// ────────-------------------
// Combined Schema
// ────────-------------------
export const envSchema = z.object({
  ...appMetaSchema.shape,
  ...supabaseSchema.shape,
  ...openaiSchema.shape,
  ...googleVisionSchema.shape,
  ...oauthSchema.shape,
  ...emailSchema.shape,
  ...backendSchema.shape,
  ...frontendSchema.shape,
  ...mobileSchema.shape,
  ...storageSchema.shape,
  ...realtimeSchema.shape,
  ...monitoringSchema.shape,
  ...featureFlagsSchema.shape,
  ...devToolsSchema.shape,
  ...testSchema.shape,
});

export type EnvConfig = z.infer<typeof envSchema>;

// ────────-------------------
// Validation Helper
// ────────-------------------
export function validateEnv(config: Record<string, string | undefined>): EnvConfig {
  const normalized = Object.fromEntries(
    Object.entries(config).map(([k, v]) => [k, v === '' ? undefined : v])
  );
  const result = envSchema.safeParse(normalized);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => 
      `${e.path.join('.')}: ${e.message}`
    ).join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  
  return result.data;
}

// ────────-------------------
// Load and Validate (for Node.js)
// ────────-------------------
function envSearchRoots(): string[] {
  const fs = require('fs');
  const path = require('path');

  const roots: string[] = [];
  let dir = process.cwd();

  for (;;) {
    roots.push(dir);
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return roots;
}

export function loadEnv(): EnvConfig {
  // Load lowest-priority files first, then override with higher-priority ones.
  // Search cwd, then walk up to the monorepo root (pnpm-workspace.yaml)
  // so apps/* can read the root .env.local when run via turbo/pnpm.
  const fs = require('fs');
  const path = require('path');
  const nodeEnv = process.env.NODE_ENV || 'development';

  const envFiles = [
    '.env',
    `.env.${nodeEnv}`,
    '.env.local',
    `.env.${nodeEnv}.local`,
  ];

  for (const root of envSearchRoots()) {
    for (const file of envFiles) {
      const filePath = path.join(root, file);
      if (fs.existsSync(filePath)) {
        require('dotenv').config({ path: filePath, override: true });
      }
    }
  }

  return validateEnv(process.env);
}