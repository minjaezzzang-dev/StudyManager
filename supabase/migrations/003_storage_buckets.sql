-- 003_storage_buckets.sql
-- Storage 버킷 생성 (Supabase CLI로 실행 시 자동 생성되지만, 참고용으로 SQL 작성)

-- OCR 이미지 저장 버킷
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ocr-images',
  'ocr-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- TTS 오디오 저장 버킷
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tts-audio',
  'tts-audio',
  true,
  5242880, -- 5MB
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS 정책
-- ocr-images: 인증된 사용자만 업로드 가능, 전체 공개 읽기
CREATE POLICY "Authenticated users can upload OCR images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ocr-images' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view OCR images" ON storage.objects
  FOR SELECT USING (bucket_id = 'ocr-images');

-- tts-audio: 인증된 사용자만 업로드 가능, 전체 공개 읽기
CREATE POLICY "Authenticated users can upload TTS audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tts-audio' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view TTS audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'tts-audio');