import { NoticeTranslatePort } from '../ports';
import { LanguageCode } from '../types/Language';

export interface TranslateNoticeInput {
  noticeId: string;
  title: string;
  content: string;
  targetLanguages: LanguageCode[];
}

export interface TranslateNoticeOutput {
  translations: Record<LanguageCode, { title: string; content: string }>;
}

export class TranslateNotice {
  constructor(private readonly noticeTranslatePort: NoticeTranslatePort) {}

  async execute(input: TranslateNoticeInput): Promise<TranslateNoticeOutput> {
    if (!input.title.trim() || !input.content.trim()) {
      throw new Error('Title and content are required');
    }

    const result = await this.noticeTranslatePort.translateNotice({
      noticeId: input.noticeId,
      title: input.title,
      content: input.content,
      targetLanguages: input.targetLanguages,
    });

    return result;
  }
}