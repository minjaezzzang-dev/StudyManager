export interface Textbook {
  id: string;
  title: string;
  description?: string;
  teacherId: string;
  language: 'en' | 'ko' | 'zh' | 'vi';
  gradeLevel?: string;
  subject?: string;
  coverImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}