import { PersonaPort } from '../ports';
import { LanguageCode } from '../types/Language';

export interface AskPersonaInput {
  personaId: string;
  question: string;
  language: LanguageCode;
  context?: string;
}

export interface AskPersonaOutput {
  answer: string;
}

export class AskPersona {
  constructor(private readonly personaPort: PersonaPort) {}

  async execute(input: AskPersonaInput): Promise<AskPersonaOutput> {
    if (!input.question.trim()) {
      throw new Error('Question cannot be empty');
    }

    const answer = await this.personaPort.askPersona({
      personaId: input.personaId,
      question: input.question,
      language: input.language,
      context: input.context,
    });

    return { answer };
  }
}