/**
 * API 클라이언트 — 백엔드 Express 서버와 통신
 *
 * 환경 변수:
 * - NEXT_PUBLIC_API_URL: 백엔드 서버 URL
 */

import { supabase } from './supabase-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    console.warn('인증 만료 — 다시 로그인이 필요합니다.');
  }
  if (response.status === 429) {
    console.warn('Rate limit 초과');
  }

  return response;
}

/**
 * DEBUG 모드 및 소셜 로그인 상태 확인
 */
export async function checkAuthStatus() {
  const res = await apiFetch('/api/auth/status');
  return res.json();
}

/**
 * 이메일 인증 코드 발송
 */
export async function sendVerificationEmail(email: string) {
  const res = await apiFetch('/api/auth/send-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return res.json();
}

/**
 * 이메일 인증 코드 검증
 */
export async function verifyEmailCode(email: string, code: string) {
  const res = await apiFetch('/api/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  return res.json();
}

/**
 * 이메일 인증 코드 재발송
 */
export async function resendVerificationEmail(email: string) {
  const res = await apiFetch('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function getProfile() {
  const res = await apiFetch('/api/profiles');
  return res.json();
}

export async function saveProfile(data: { name: string; role: string; native_language: string }) {
  const res = await apiFetch('/api/profiles', { method: 'POST', body: JSON.stringify(data) });
  return res.json();
}

export async function getTranslations() {
  const res = await apiFetch('/api/translations');
  return res.json();
}

export async function saveTranslation(data: {
  type: 'ocr' | 'notice';
  source_text?: string;
  target_lang: string;
  result_text?: string;
}) {
  const res = await apiFetch('/api/translations', { method: 'POST', body: JSON.stringify(data) });
  return res.json();
}

export async function getDialogs() {
  const res = await apiFetch('/api/dialogs');
  return res.json();
}

export async function saveDialog(data: {
  mode: 'debate' | 'interview';
  messages: Array<{ role: string; content: string; lang: string }>;
}) {
  const res = await apiFetch('/api/dialogs', { method: 'POST', body: JSON.stringify(data) });
  return res.json();
}

export async function getTextbooks() {
  const res = await apiFetch('/api/textbooks');
  return res.json();
}

export { API_URL };
