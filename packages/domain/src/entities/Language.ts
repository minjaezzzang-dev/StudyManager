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