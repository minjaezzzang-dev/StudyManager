-- 002_rls_policies.sql
-- Row Level Security 정책

-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- 1. users 테이블: 본인만 조회/수정 가능
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 2. textbooks 테이블: 교사는 CRUD 가능, 학생은 읽기만 가능
CREATE POLICY "Teachers can manage textbooks" ON public.textbooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Students can view textbooks" ON public.textbooks
  FOR SELECT USING (true);

-- 3. text_chunks 테이블: 교사는 CRUD 가능, 학생은 읽기만 가능
CREATE POLICY "Teachers can manage text chunks" ON public.text_chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.textbooks t
      JOIN public.users u ON t.teacher_id = u.id
      WHERE t.id = text_chunks.textbook_id 
      AND u.id = auth.uid() 
      AND u.role = 'teacher'
    )
  );

CREATE POLICY "Students can view text chunks" ON public.text_chunks
  FOR SELECT USING (true);

-- 4. personas 테이블: 전체 읽기 가능, 관리자만 쓰기 가능
CREATE POLICY "Anyone can view active personas" ON public.personas
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage personas" ON public.personas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. translations 테이블: 본인만 CRUD 가능
CREATE POLICY "Users can manage own translations" ON public.translations
  FOR ALL USING (auth.uid() = user_id);

-- 6. dialogs 테이블: 본인만 CRUD 가능
CREATE POLICY "Users can manage own dialogs" ON public.dialogs
  FOR ALL USING (auth.uid() = user_id);

-- 7. notices 테이블: 전체 읽기 가능, 작성자/관리자는 쓰기 가능
CREATE POLICY "Anyone can view published notices" ON public.notices
  FOR SELECT USING (is_published = true);

CREATE POLICY "Authors can manage own notices" ON public.notices
  FOR ALL USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all notices" ON public.notices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 8. records 테이블: 본인만 CRUD 가능
CREATE POLICY "Users can manage own records" ON public.records
  FOR ALL USING (auth.uid() = user_id);