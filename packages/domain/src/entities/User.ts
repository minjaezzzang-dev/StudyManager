export interface User {
  id: string;
  email: string;
  fullName: string;
  nationality: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends Omit<User, 'email'> {
  avatarUrl?: string;
  preferredLanguage: 'en' | 'ko' | 'zh' | 'vi';
}