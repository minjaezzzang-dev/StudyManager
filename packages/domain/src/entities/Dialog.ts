export interface Dialog {
  id: string;
  userId: string;
  personaId: string;
  userMessage: string;
  personaResponse: string;
  language: 'en' | 'ko' | 'zh' | 'vi';
  createdAt: Date;
}