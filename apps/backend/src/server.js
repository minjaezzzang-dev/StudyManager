/**
 * =============================================================
 * EasyKR Backend Server — Render.com 배포용 Express 서버
 * =============================================================
 *
 * [기능 구성]
 * 1. Supabase DB 및 클라이언트 연동 (GET/POST 샘플 API)
 * 2. Supabase Auth JWT 토큰 검증 미들웨어
 * 3. Render & Supabase 무료 티어 잠자기 방지 자동화
 *
 * [환경 변수]
 * - SUPABASE_URL         : Supabase 프로젝트 URL
 * - SUPABASE_ANON_KEY    : Supabase anon (public) key
 * - SUPABASE_SERVICE_KEY : Supabase service_role key (서버 전용, RLS 우회용)
 * - SERVER_URL           : Render 배포 후 자기 자신의 URL (예: https://easykr.onrender.com)
 * - PORT                 : 렌더에서 자동 주입 (기본 10000)
 * =============================================================
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────────
// 환경 변수 로드
// ──────────────────────────────────────────────
dotenv.config();

const PORT = process.env.PORT || 10000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// 필수 환경 변수 검증
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL 및 SUPABASE_ANON_KEY 환경 변수가 필요합니다.');
  console.error('   .env 파일 또는 Render 대시보드에서 설정해주세요.');
  process.exit(1);
}

// ──────────────────────────────────────────────
// 1. Supabase 클라이언트 초기화
// ──────────────────────────────────────────────

/**
 * 일반 클라이언트: anon key 사용 (RLS 정책 적용됨)
 * - 사용자 권한으로 동작하며 RLS 정책의 보호를 받습니다.
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * 서비스 롤 클라이언트: service_role key 사용 (RLS 우회)
 * - 서버 내부 관리용으로만 사용. 절대 클라이언트에 노출 금지.
 * - 잠자기 방지용 SELECT 쿼리 등에 사용합니다.
 */
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ──────────────────────────────────────────────
// Express 앱 초기화
// ──────────────────────────────────────────────
const app = express();

// CORS: 프론트엔드(Next.js, Expo)에서의 API 접근 허용
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ──────────────────────────────────────────────
// 2. Supabase Auth 토큰 검증 미들웨어
// ──────────────────────────────────────────────

/**
 * authenticateToken 미들웨어
 *
 * 프론트엔드에서 `Authorization: Bearer <JWT>` 헤더로 보낸
 * Supabase Auth JWT 토큰을 검증합니다.
 *
 * - 토큰이 유효하면: 유저 정보를 req.user에 담아 next() 호출
 * - 토큰이 없거나 유효하지 않으면: 401 Unauthorized 응답
 *
 * 사용 예시:
 *   router.post('/data', authenticateToken, async (req, res) => {
 *     const userId = req.user.id;
 *     // ...
 *   });
 */
async function authenticateToken(req, res, next) {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '인증 토큰이 필요합니다.',
        message: 'Authorization: Bearer <token> 헤더를 포함해주세요.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '유효하지 않은 토큰 형식입니다.' });
    }

    // Supabase로 토큰 검증 — getUser()가 JWT를 파싱하여 유저 정보 반환
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: '유효하지 않거나 만료된 토큰입니다.',
        message: error?.message || '다시 로그인해주세요.',
      });
    }

    // 검증된 유저 정보를 req.user에 저장
    req.user = {
      id: user.id,
      email: user.email,
      aud: user.aud,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error('[Auth 미들웨어 오류]', err);
    return res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
}

// ──────────────────────────────────────────────
// 3. API 엔드포인트
// ──────────────────────────────────────────────

/**
 * GET / — 헬스 체크 (인증 불필요)
 */
app.get('/', (req, res) => {
  res.json({
    name: 'EasyKR Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /ping — Render 잠자기 방지용 엔드포인트 (인증 불필요)
 *
 * cron이 10분마다 이 엔드포인트로 HTTP 요청을 보내
 * Render 무료 티어 서버가 잠들지 않게 유지합니다.
 */
app.get('/ping', (req, res) => {
  res.json({
    message: 'pong',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /api/profiles — 프로필 목록 조회 (인증 필요)
 *
 * Supabase profiles 테이블에서 데이터를 조회합니다.
 * RLS 정책에 의해 본인 프로필만 반환됩니다.
 */
app.get('/api/profiles', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      // PGRST116: 행이 없음 (프로필 미생성)
      if (error.code === 'PGRST116') {
        return res.json({ data: null, message: '프로필이 아직 생성되지 않았습니다.' });
      }
      throw error;
    }

    res.json({ data, message: '프로필 조회 성공' });
  } catch (err) {
    console.error('[GET /api/profiles 오류]', err);
    res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.', detail: err.message });
  }
});

/**
 * POST /api/profiles — 프로필 생성/저장 (인증 필요)
 *
 * Body: { name, role, native_language }
 * RLS 정책: 본인 프로필만 insert 가능 (auth.uid() = id)
 */
app.post('/api/profiles', authenticateToken, async (req, res) => {
  try {
    const { name, role, native_language } = req.body;

    // 입력 검증
    if (!name || !role || !native_language) {
      return res.status(400).json({
        error: '필수 필드가 누락되었습니다.',
        required: ['name', 'role', 'native_language'],
      });
    }

    // 유효한 role 값 검증
    const validRoles = ['student', 'teacher', 'parent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: `role은 ${validRoles.join(', ')} 중 하나여야 합니다.`,
      });
    }

    // Supabase에 프로필 upsert (id는 auth.users의 id)
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: req.user.id,
        name,
        role,
        native_language,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data, message: '프로필이 저장되었습니다.' });
  } catch (err) {
    console.error('[POST /api/profiles 오류]', err);
    res.status(500).json({ error: '데이터 저장 중 오류가 발생했습니다.', detail: err.message });
  }
});

/**
 * GET /api/translations — 번역 기록 조회 (인증 필요)
 *
 * 본인의 번역 기록만 조회됩니다 (RLS 정책).
 */
app.get('/api/translations', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ data, message: '번역 기록 조회 성공' });
  } catch (err) {
    console.error('[GET /api/translations 오류]', err);
    res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.', detail: err.message });
  }
});

/**
 * POST /api/translations — 번역 기록 저장 (인증 필요)
 *
 * Body: { type, source_text, target_lang, result_text }
 * type: 'ocr' | 'notice'
 */
app.post('/api/translations', authenticateToken, async (req, res) => {
  try {
    const { type, source_text, target_lang, result_text } = req.body;

    if (!type || !target_lang) {
      return res.status(400).json({
        error: '필수 필드가 누락되었습니다.',
        required: ['type', 'target_lang'],
      });
    }

    const { data, error } = await supabase
      .from('translations')
      .insert({
        user_id: req.user.id,
        type,
        source_text: source_text || '',
        target_lang,
        result_text: result_text || '',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data, message: '번역 기록이 저장되었습니다.' });
  } catch (err) {
    console.error('[POST /api/translations 오류]', err);
    res.status(500).json({ error: '데이터 저장 중 오류가 발생했습니다.', detail: err.message });
  }
});

/**
 * GET /api/dialogs — 대화 기록 조회 (인증 필요)
 */
app.get('/api/dialogs', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dialogs')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ data, message: '대화 기록 조회 성공' });
  } catch (err) {
    console.error('[GET /api/dialogs 오류]', err);
    res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.', detail: err.message });
  }
});

/**
 * POST /api/dialogs — 대화 기록 저장 (인증 필요)
 *
 * Body: { mode, messages }
 * mode: 'debate' | 'interview'
 * messages: [{ role, content, lang }]
 */
app.post('/api/dialogs', authenticateToken, async (req, res) => {
  try {
    const { mode, messages } = req.body;

    if (!mode || !messages) {
      return res.status(400).json({
        error: '필수 필드가 누락되었습니다.',
        required: ['mode', 'messages'],
      });
    }

    const { data, error } = await supabase
      .from('dialogs')
      .insert({
        user_id: req.user.id,
        mode,
        messages,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data, message: '대화 기록이 저장되었습니다.' });
  } catch (err) {
    console.error('[POST /api/dialogs 오류]', err);
    res.status(500).json({ error: '데이터 저장 중 오류가 발생했습니다.', detail: err.message });
  }
});

/**
 * GET /api/textbooks — 교과서 목록 조회 (인증 필요, 모두 읽기 가능)
 */
app.get('/api/textbooks', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('textbooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data, message: '교과서 목록 조회 성공' });
  } catch (err) {
    console.error('[GET /api/textbooks 오류]', err);
    res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.', detail: err.message });
  }
});

// ──────────────────────────────────────────────
// 4. Render & Supabase 무료 티어 잠자기 방지 자동화
// ──────────────────────────────────────────────

/**
 * [Render 잠자기 방지]
 * 10분마다 자기 자신의 /ping 엔드포인트로 HTTP 요청 전송
 *
 * Render 무료 티어는 15분간 요청이 없으면 서버를 잠재웁니다.
 * 이를 방지하기 위해 10분 간격으로 ping을 보냅니다.
 */
cron.schedule('*/10 * * * *', async () => {
  try {
    const pingUrl = `${SERVER_URL}/ping`;
    console.log(`[Render Keep-Alive] Pinging ${pingUrl} ...`);

    // Node.js 18+ 내장 fetch 사용
    const response = await fetch(pingUrl);
    const data = await response.json();

    console.log(`[Render Keep-Alive] ✅ Response: ${response.status} — ${data.message} at ${data.timestamp}`);
  } catch (err) {
    console.error('[Render Keep-Alive] ❌ Ping 실패:', err.message);
  }
});

/**
 * [Supabase 잠자기 방지]
 * 매일 자정(서버 시간)에 Supabase DB에 가벼운 SELECT 쿼리 실행
 *
 * Supabase 무료 �어는 1주일간 비활성 상태면 DB를 일시 정지합니다.
 * 이를 방지하기 위해 하루 1회 SELECT 쿼리를 날립니다.
 * service_role 클라이언트를 사용해 RLS 없이 실행합니다.
 */
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('[Supabase Keep-Alive] DB 활성화 쿼리 실행 중...');

    // 가벼운 SELECT 쿼리 — 1건만 조회
    const { data, error } = await supabaseAdmin
      .from('textbooks')
      .select('id')
      .limit(1);

    if (error) {
      // 테이블이 비어있어도 OK — 에러가 아니면 DB가 살아있음
      console.log('[Supabase Keep-Alive] 쿼리 실행 (테이블 상태 확인):', error.message);
    } else {
      console.log(`[Supabase Keep-Alive] ✅ DB 활성 — ${data?.length || 0}행 조회됨 at ${new Date().toISOString()}`);
    }
  } catch (err) {
    console.error('[Supabase Keep-Alive] ❌ DB 쿼리 실패:', err.message);
  }
});

// ──────────────────────────────────────────────
// 서버 시작
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log(`  EasyKR Backend Server`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Server URL: ${SERVER_URL}`);
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log('═══════════════════════════════════════════════');
  console.log('  [Keep-Alive] Render ping: 10분마다');
  console.log('  [Keep-Alive] Supabase DB: 매일 자정');
  console.log('═══════════════════════════════════════════════');
  console.log(`  서버가 시작되었습니다: ${new Date().toISOString()}`);
});
