export type RecordType = 'translation' | 'interpretation' | 'debate' | 'persona_chat';

export interface Record {
  id: string;
  userId: string;
  type: RecordType;
  data: Record<string, unknown>;
  createdAt: Date;
}