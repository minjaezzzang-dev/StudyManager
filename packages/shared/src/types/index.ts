export const LANGUAGE_CODES = [
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
] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export type LanguageName =
  | 'Korean'
  | 'English'
  | 'Chinese'
  | 'Vietnamese'
  | 'Japanese'
  | 'Thai'
  | 'Uzbek'
  | 'Mongolian'
  | 'Nepali'
  | 'Burmese'
  | 'Khmer'
  | 'Tagalog';

export interface Language {
  code: LanguageCode;
  name: LanguageName;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'uz', name: 'Uzbek', nativeName: "Oʻzbekcha", flag: '🇺🇿' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', flag: '🇰🇭' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog', flag: '🇵🇭' },
];

export function getLanguageByCode(code: LanguageCode): Language | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

export function getLanguageByName(name: LanguageName): Language | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.name === name);
}

export function getLanguageName(code: string): string {
  return getLanguageByCode(code as LanguageCode)?.name ?? code;
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
