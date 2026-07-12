import { InterpretationPort } from '../ports';
import { LanguageCode } from '../types/Language';

export interface InterpretSpeechInput {
  audioBase64: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

export interface InterpretSpeechOutput {
  audioUrl: string;
  text: string;
}

export class InterpretSpeech {
  constructor(private readonly interpretationPort: InterpretationPort) {}

  async execute(input: InterpretSpeechInput): Promise<InterpretSpeechOutput> {
    if (!input.audioBase64) {
      throw new Error('Audio data is required');
    }

    if (input.sourceLanguage === input.targetLanguage) {
      throw new Error('Source and target languages must be different');
    }

    const result = await this.interpretationPort.interpretSpeech({
      audioBase64: input.audioBase64,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
    });

    return result;
  }
}