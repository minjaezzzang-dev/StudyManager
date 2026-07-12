import { TextChunk } from './TextChunk';

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  language: 'en' | 'ko' | 'zh' | 'vi';
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonaWithContext extends Persona {
  relevantChunks?: TextChunk[];
}