export interface TextChunk {
  id: string;
  textbookId: string;
  content: string;
  embedding: number[];
  pageNumber?: number;
  chunkIndex: number;
  createdAt: Date;
}

export interface TextChunkWithDistance extends TextChunk {
  distance: number;
}