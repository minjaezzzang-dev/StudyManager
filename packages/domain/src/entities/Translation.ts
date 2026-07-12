export interface Translation {
  id: string;
  userId: string;
  sourceText: string;
  targetText: string;
  sourceLanguage: 'en' | 'ko' | 'zh' | 'vi';
  targetLanguage: 'en' | 'ko' | 'zh' | 'vi';
  mode: 'text' | 'camera' | 'voice';
  createdAt: Date;
}