import { z } from 'zod';

export const emailSchema = z.string().email('유효한 이메일 주소를 입력해주세요.');

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
  .regex(/[A-Z]/, '대문자를 최소 1개 포함해야 합니다.')
  .regex(/[a-z]/, '소문자를 최소 1개 포함해야 합니다.')
  .regex(/[0-9]/, '숫자를 최소 1개 포함해야 합니다.');

export const nameSchema = z
  .string()
  .min(1, '이름을 입력해주세요.')
  .max(50, '이름은 50자 이하여야 합니다.');

export const nationalitySchema = z.string().min(1, '국적을 선택해주세요.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: nameSchema,
  nationality: nationalitySchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
});

export const translateTextSchema = z.object({
  sourceText: z.string().min(1, '번역할 텍스트를 입력해주세요.').max(5000, '텍스트가 너무 깁니다.'),
  sourceLanguage: z.enum(['en', 'ko', 'zh', 'vi']),
  targetLanguage: z.enum(['en', 'ko', 'zh', 'vi']),
  mode: z.enum(['text', 'camera', 'document']),
});

export const interpretSpeechSchema = z.object({
  audioBase64: z.string().min(1, '오디오 데이터가 필요합니다.'),
  sourceLanguage: z.enum(['en', 'ko', 'zh', 'vi']),
  targetLanguage: z.enum(['en', 'ko', 'zh', 'vi']),
});

export const askPersonaSchema = z.object({
  personaId: z.string().uuid('유효한 페르소나 ID가 필요합니다.'),
  question: z.string().min(1, '질문을 입력해주세요.').max(2000, '질문이 너무 깁니다.'),
  language: z.enum(['en', 'ko', 'zh', 'vi']),
  textbookId: z.string().uuid().optional(),
});

export const createPersonaSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.').max(100, '이름은 100자 이하여야 합니다.'),
  description: z.string().max(500, '설명은 500자 이하여야 합니다.'),
  systemPrompt: z.string().min(10, '시스템 프롬프트는 최소 10자 이상이어야 합니다.').max(3000, '시스템 프롬프트가 너무 깁니다.'),
  language: z.enum(['en', 'ko', 'zh', 'vi']),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

export const createTextbookSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.').max(200, '제목은 200자 이하여야 합니다.'),
  description: z.string().max(1000, '설명은 1000자 이하여야 합니다.').optional(),
  language: z.enum(['en', 'ko', 'zh', 'vi']),
  gradeLevel: z.string().optional(),
  subject: z.string().optional(),
});

export const createNoticeSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.').max(200, '제목은 200자 이하여야 합니다.'),
  content: z.string().min(1, '내용을 입력해주세요.').max(5000, '내용이 너무 깁니다.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type TranslateTextInput = z.infer<typeof translateTextSchema>;
export type InterpretSpeechInput = z.infer<typeof interpretSpeechSchema>;
export type AskPersonaInput = z.infer<typeof askPersonaSchema>;
export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;
export type CreateTextbookInput = z.infer<typeof createTextbookSchema>;
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;