-- 001_initial_schema.sql
-- 다함께교실 초기 데이터베이스 스키마
-- pgvector 확장 활성화 (HNSW 인덱스용)

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. users 테이블 (auth.users와 연동)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'ko' CHECK (preferred_language IN ('en', 'ko', 'zh', 'vi')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. textbooks 테이블
CREATE TABLE IF NOT EXISTS public.textbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en', 'ko', 'zh', 'vi')),
  grade_level TEXT,
  subject TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. text_chunks 테이블 (pgvector 임베딩 저장)
CREATE TABLE IF NOT EXISTS public.text_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_id UUID NOT NULL REFERENCES public.textbooks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  page_number INTEGER,
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW 인덱스 생성 (벡터 유사도 검색용)
CREATE INDEX IF NOT EXISTS text_chunks_embedding_hnsw_idx 
ON public.text_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. personas 테이블
CREATE TABLE IF NOT EXISTS public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'ko', 'zh', 'vi')),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. translations 테이블
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  source_language TEXT NOT NULL CHECK (source_language IN ('en', 'ko', 'zh', 'vi')),
  target_language TEXT NOT NULL CHECK (target_language IN ('en', 'ko', 'zh', 'vi')),
  mode TEXT NOT NULL CHECK (mode IN ('text', 'camera', 'voice')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. dialogs 테이블 (페르소나 대화 기록)
CREATE TABLE IF NOT EXISTS public.dialogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  persona_response TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'ko', 'zh', 'vi')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. notices 테이블 (공지사항)
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  translated_content JSONB,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. records 테이블 (학습 기록)
CREATE TABLE IF NOT EXISTS public.records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('translation', 'interpretation', 'debate', 'persona_chat')),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_textbooks_teacher_id ON public.textbooks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_text_chunks_textbook_id ON public.text_chunks(textbook_id);
CREATE INDEX IF NOT EXISTS idx_translations_user_id ON public.translations(user_id);
CREATE INDEX IF NOT EXISTS idx_dialogs_user_id ON public.dialogs(user_id);
CREATE INDEX IF NOT EXISTS idx_dialogs_persona_id ON public.dialogs(persona_id);
CREATE INDEX IF NOT EXISTS idx_notices_author_id ON public.notices(author_id);
CREATE INDEX IF NOT EXISTS idx_notices_published ON public.notices(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON public.records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_type ON public.records(type);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_textbooks_updated_at BEFORE UPDATE ON public.textbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();