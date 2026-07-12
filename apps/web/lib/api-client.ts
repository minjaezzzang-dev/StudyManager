/**
 * API 클라이언트 — 백엔드 Express 서버와 통신
 *
 * 환경 변수:
 * - NEXT_PUBLIC_API_URL: 백엔드 서버 URL (예: http://localhost:10000 또는 https://easykr-backend.onrender.com)
 *
 * 모든 인증 필요 API 호출은 Supabase Auth 세션 토큰을
 * Authorization: Bearer <JWT> 헤더로 전송합니다.
 */

import { supabase } from './supabase-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

/**
 * 현재 Supabase 세션에서 액세스 토큰을 가져옵니다.
 */
async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/**
 * 인증 헤더를 포함한 fetch 래퍼
 *
 * @param path API 경로 (예: '/api/profiles')
 * @param options fetch 옵션
 * @returns Response 객체
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // 토큰이 있으면 Authorization 헤더 추가
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // 401 에러 시 세션 만료 처리
  if (response.status === 401) {
    console.warn('인증 만료 — 다시 로그인이 필요합니다.');
  }

  return response;
}

/**
 * 프로필 조회
 */
export async function getProfile() {
  const res = await apiFetch('/api/profiles');
  return res.json();
}

/**
 * 프로필 생성/수정
 */
export async function saveProfile(data: { name: string; role: string; native_language: string }) {
  const res = await apiFetch('/api/profiles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * 번역 기록 조회
 */
export async function getTranslations() {
  const res = await apiFetch('/api/translations');
  return res.json();
}

/**
 * 번역 기록 저장
 */
export async function saveTranslation(data: {
  type: 'ocr' | 'notice';
  source_text?: string;
  target_lang: string;
  result_text?: string;
}) {
  const res = await apiFetch('/api/translations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * 대화 기록 조회
 */
export async function getDialogs() {
  const res = await apiFetch('/api/dialogs');
  return res.json();
}

/**
 * 대화 기록 저장
 */
export async function saveDialog(data: {
  mode: 'debate' | 'interview';
  messages: Array<{ role: string; content: string; lang: string }>;
}) {
  const res = await apiFetch('/api/dialogs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * 교과서 목록 조회
 */
export async function getTextbooks() {
  const res = await apiFetch('/api/textbooks');
  return res.json();
}

export { API_URL };
