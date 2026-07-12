export type LanguageCode = 'en' | 'ko' | 'zh' | 'vi';

export type LanguageName = 'English' | 'Korean' | 'Chinese' | 'Vietnamese';

export interface Language {
  code: LanguageCode;
  name: LanguageName;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
];

export function getLanguageByCode(code: LanguageCode): Language | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

export function getLanguageByName(name: LanguageName): Language | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.name === name);
}

export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  nationality: string;
  role: UserRole;
  preferredLanguage: LanguageCode;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type RecordType = 'translation' | 'interpretation' | 'debate' | 'persona_chat';

export interface LearningRecord {
  id: string;
  userId: string;
  type: RecordType;
  data: Record<string, unknown>;
  createdAt: string;
}