import { RagPort } from '../ports';
import { LanguageCode } from '../types/Language';

export interface IngestTextbookInput {
  textbookId: string;
  imageBase64: string;
}

export interface IngestTextbookOutput {
  chunksCreated: number;
}

export class IngestTextbook {
  constructor(private readonly ragPort: RagPort) {}

  async execute(input: IngestTextbookInput): Promise<IngestTextbookOutput> {
    if (!input.imageBase64) {
      throw new Error('Image data is required');
    }

    const result = await this.ragPort.ingestTextbook({
      textbookId: input.textbookId,
      imageBase64: input.imageBase64,
    });

    return { chunksCreated: result.chunksCreated };
  }
}