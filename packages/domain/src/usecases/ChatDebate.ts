import { DebatePort } from '../ports';
import { LanguageCode } from '../types/Language';

export interface ChatDebateInput {
  userId: string;
  message: string;
  topic: string;
  stance: 'pro' | 'con';
  language: LanguageCode;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatDebateOutput {
  response: string;
  feedback?: string;
  isComplete: boolean;
}

export class ChatDebate {
  constructor(private readonly debatePort: DebatePort) {}

  async execute(input: ChatDebateInput): Promise<ChatDebateOutput> {
    if (!input.message.trim()) {
      throw new Error('Message cannot be empty');
    }

    const result = await this.debatePort.chatDebate({
      userId: input.userId,
      message: input.message,
      topic: input.topic,
      stance: input.stance,
      language: input.language,
      conversationHistory: input.conversationHistory,
    });

    return result;
  }
}