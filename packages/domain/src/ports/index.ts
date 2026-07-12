export interface TranslationPort {
  translateText(input: {
    text: string;
    sourceLanguage: 'en' | 'ko' | 'zh' | 'vi';
    targetLanguage: 'en' | 'ko' | 'zh' | 'vi';
  }): Promise<string>;
}

export interface InterpretationPort {
  interpretSpeech(input: {
    audioBase64: string;
    sourceLanguage: 'en' | 'ko' | 'zh' | 'vi';
    targetLanguage: 'en' | 'ko' | 'zh' | 'vi';
  }): Promise<{ audioUrl: string; text: string }>;
}

export interface RagPort {
  ingestTextbook(input: {
    textbookId: string;
    imageBase64: string;
  }): Promise<{ chunksCreated: number }>;
  searchContext(input: {
    query: string;
    textbookId?: string;
    language?: 'en' | 'ko' | 'zh' | 'vi';
    limit?: number;
  }): Promise<Array<{ content: string; similarity: number }>>;
}

export interface PersonaPort {
  askPersona(input: {
    personaId: string;
    question: string;
    language: 'en' | 'ko' | 'zh' | 'vi';
    context?: string;
  }): Promise<string>;
}

export interface DebatePort {
  chatDebate(input: {
    userId: string;
    message: string;
    topic: string;
    stance: 'pro' | 'con';
    language: 'en' | 'ko' | 'zh' | 'vi';
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<{ response: string; feedback?: string; isComplete: boolean }>;
}

export interface NoticeTranslatePort {
  translateNotice(input: {
    noticeId: string;
    title: string;
    content: string;
    targetLanguages: Array<'en' | 'ko' | 'zh' | 'vi'>;
  }): Promise<Record<'en' | 'ko' | 'zh' | 'vi', { title: string; content: string }>>;
}