// =============================================================
// EasyKR Backend — Route Schemas (Zod)
// =============================================================
// Validation schemas for all API endpoints
// =============================================================

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Auth Schemas
// ────────-------------------
export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1, 'Name is required').max(100),
  role: z.enum(['student', 'teacher', 'parent']).default('student'),
  nativeLanguage: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ────────-------------------
// OAuth Schemas
// ────────-------------------
export const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  provider: z.enum(['google', 'apple', 'x', 'facebook', 'kakao']),
});

export const linkAccountSchema = z.object({
  provider: z.enum(['google', 'apple', 'x', 'facebook', 'kakao']),
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
});

// ────────-------------------
// Translation Schemas
// ────────-------------------
export const translateTextSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000, 'Text too long'),
  sourceLanguage: z.enum(['auto', 'ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
  targetLanguage: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
  mode: z.enum(['text', 'camera', 'document', 'voice']).default('text'),
  /** When set, skip LLM and persist this as the target text (e.g. Gemini Live history). */
  translatedText: z.string().min(1).max(10000).optional(),
});

export const translateVoiceSchema = z.object({
  audioBase64: z.string().min(1, 'Audio data is required'),
  sourceLanguage: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
  targetLanguage: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
});

export const translateCameraSchema = z.object({
  imageBase64: z.string().min(1, 'Image data is required'),
  sourceLanguage: z.enum(['auto', 'ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
  targetLanguage: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
});

export const translateDocumentSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  sourceLanguage: z.enum(['auto', 'ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
  targetLanguage: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
});

// ────────-------------------
// Persona Chat Schemas
// ────────-------------------
export const askPersonaSchema = z.object({
  personaId: z.string().uuid('Invalid persona ID'),
  question: z.string().min(1, 'Question is required').max(2000, 'Question too long'),
  language: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
  textbookId: z.string().uuid().optional(),
  /** Selected unit conversation topic (토의/대화 주제) */
  topic: z.string().min(1).max(200).optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(500),
      })
    )
    .max(8)
    .optional(),
});

export const embodyPersonaSchema = z.object({
  textbookId: z.string().uuid(),
  unitId: z.string().min(1).max(40),
  story: z.object({
    title: z.string().min(1).max(120),
    summary: z.string().max(400).optional().default(''),
    excerpt: z.string().max(2000).optional().default(''),
  }),
  character: z.object({
    name: z.string().min(1).max(40),
    role: z.string().max(40).optional().default('등장인물'),
    description: z.string().max(200).optional().default(''),
    avatar_emoji: z.string().max(8).optional(),
  }),
  language: z
    .enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl'])
    .optional(),
});

// ────────-------------------
// Debate Schemas
// ────────-------------------
export const startDebateSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500),
  stance: z.enum(['pro', 'con']),
  language: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
  textbookId: z.string().uuid().optional(),
});

export const debateTurnSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
});

// ────────-------------------
// Notice Schemas
// ────────-------------------
export const createNoticeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(10000),
  targetLanguages: z.array(z.enum(['en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl'])).optional(),
});

export const updateNoticeSchema = createNoticeSchema.partial().extend({
  isPublished: z.boolean().optional(),
});

// ────────-------------------
// Textbook/RAG Schemas
// ────────-------------------
export const createTextbookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  language: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
  gradeLevel: z.string().optional(),
  subject: z.string().optional(),
});

export const ingestTextbookSchema = z.object({
  textbookId: z.string().uuid('Invalid textbook ID'),
  imageBase64: z.string().min(1, 'Image data is required'),
  pageNumber: z.number().int().positive().optional(),
});

// ────────-------------------
// User Profile Schemas
// ────────-------------------
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nativeLanguage: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']).optional(),
  preferredLanguage: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']).optional(),
  avatarUrl: z.string().url().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ────────-------------------
// Query Parameter Schemas
// ────────-------------------
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const translationHistoryQuerySchema = paginationSchema.extend({
  type: z.enum(['text', 'camera', 'voice', 'document']).optional(),
  sourceLanguage: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']).optional(),
  targetLanguage: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID'),
});

export const createPersonaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(10).max(3000),
  language: z.enum(['ko', 'en', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl']),
  avatarUrl: z.string().url().optional(),
});

export const updatePersonaSchema = createPersonaSchema.partial();

export const continueDebateSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
});

export const translateNoticeSchema = z.object({
  noticeId: z.string().uuid('Invalid notice ID'),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  targetLanguages: z.array(z.enum(['en', 'ko', 'zh', 'vi', 'ja', 'th', 'uz', 'mn', 'ne', 'my', 'km', 'tl'])).min(1),
});

export const sendVerificationSchema = signupSchema;

export const verifyCodeSchema = verifyEmailSchema;

// Type exports
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type TranslateTextInput = z.infer<typeof translateTextSchema>;
export type TranslateVoiceInput = z.infer<typeof translateVoiceSchema>;
export type AskPersonaInput = z.infer<typeof askPersonaSchema>;
export type StartDebateInput = z.infer<typeof startDebateSchema>;
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
export type CreateTextbookInput = z.infer<typeof createTextbookSchema>;