import { TranslationPort } from '../ports';
import { LanguageCode } from '../types/Language';

export interface TranslateTextInput {
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

export interface TranslateTextOutput {
  translatedText: string;
}

export class TranslateText {
  constructor(private readonly translationPort: TranslationPort) {}

  async execute(input: TranslateTextInput): Promise<TranslateTextOutput> {
    if (!input.text.trim()) {
      throw new Error('Text to translate cannot be empty');
    }

    if (input.sourceLanguage === input.targetLanguage) {
      return { translatedText: input.text };
    }

    const translatedText = await this.translationPort.translateText({
      text: input.text,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
    });

    return { translatedText };
  }
}