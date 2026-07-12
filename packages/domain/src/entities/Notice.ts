export interface Notice {
  id: string;
  title: string;
  content: string;
  translatedContent: Record<'en' | 'ko' | 'zh' | 'vi', string>;
  authorId: string;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}