/**
 * =============================================================
 * EasyKR Backend Server — Render.com 배포용 Express 서버
 * =============================================================
 *
 * [기능 구성]
 * 1. Supabase DB 및 클라이언트 연동 (GET/POST API)
 * 2. Supabase Auth JWT 토큰 검증 미들웨어
 * 3. Render & Supabase 무료 티어 잠자기 방지 자동화
 * 4. 보안 강화: DDoS 방지, Rate Limit, Helmet, Input Sanitization
 * 5. AI API Rate Limit per account
 * 6. DEBUG 모드에서 소셜 로그인 비활성화
 *
 * [환경 변수]
 * - SUPABASE_URL             : Supabase 프로젝트 URL
 * - SUPABASE_ANON_KEY        : Supabase anon key
 * - SUPABASE_SERVICE_KEY     : Supabase service_role key
 * - SERVER_URL               : 배포된 서버 URL (keep-alive용)
 * - DEBUG                    : true/false — true면 소셜 로그인 비활성화
 * =============================================================
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const PORT = process.env.PORT || 10000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
const DEBUG = (process.env.DEBUG || 'false').toLowerCase() === 'true';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL 및 SUPABASE_ANON_KEY 환경 변수가 필요합니다.');
  process.exit(1);
}

// ──────────────────────────────────────────────
// Supabase 클라이언트
// ──────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// service_role — 잠자기 방지 및 서버 내부 관리용
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ──────────────────────────────────────────────
// Express + Security Middleware
// ──────────────────────────────────────────────
const app = express();

// Helmet: HTTP 보안 헤더 설정 (XSS, Content-Type sniffing, clickjacking 방지)
app.use(helmet());

// CORS: 프론트엔드만 허용 (origin 검증)
const allowedOrigins = SERVER_URL
  ? [SERVER_URL.replace(/\/$/, '').replace(/:\d+$/, '')]
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // 서버 간 통신이거나 로컬 개발은 허용
    if (!origin || allowedOrigins.some(o => origin === o || origin.startsWith('http://localhost'))) {
      callback(null, true);
    } else {
      console.warn('[CORS 차단] 정책 위반 origin:', origin);
      callback(new Error('CORS 정책 위반'), false); // ← 변경: 명시적 거부
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body size limit (DDoS 보호)
app.use(express.json({ limit: '1mb' }));

// ──────────────────────────────────────────────
// DDoS 방지: 전역 Rate Limiting
// ──────────────────────────────────────────────

/**
 * 전역 Rate Limiter
 * - 전체 서버: 15분당 최대 100개 요청 per IP
 * - DDoS/brute-force 공격 방지
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: '요청이 너무 많습니다.',
    message: '15분 후에 다시 시도해주세요.',
    retryAfter: '15분',
  },
});

app.use(globalLimiter);

/**
 * API Rate Limiter — 더 제한적인 정책
 * - API 엔드포인트: 1분당 최대 30개 요청 per IP
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'API 요청 한도를 초과했습니다.',
    message: '잠시 후 다시 시도해주세요.',
  },
});

// ──────────────────────────────────────────────
// AI API Rate Limit per Account
// ──────────────────────────────────────────────

/**
 * 사용자별 AI API 토큰 버킷 (in-memory)
 * 
 * 프로덕션에서는 Redis로 대체해야 하지만,
 * Render 무료 티어 Small 인스턴스용으로 in-memory 구현.
 * 
 * 구조: { userId: { tokens, lastRefill, maxTokens, refillRate } }
 * - maxTokens: 계정당 최대 토큰 수 (기본 100)
 * - refillRate: 1분당 재충전되는 토큰 수 (기본 10)
 * - tokens: 현재 가용 토큰
 */
const userTokenBuckets = new Map();

/**
 * AI API 호출 시 토큰 소비 및 검증
 */
function consumeAiToken(userId, cost = 1) {
  const now = Date.now();
  let bucket = userTokenBuckets.get(userId);

  if (!bucket) {
    bucket = {
      tokens: 100,
      lastRefill: now,
      maxTokens: 100,
      refillRate: 10,
    };
    userTokenBuckets.set(userId, bucket);
  }

  // 토큰 재충전 (시간 기반)
  const elapsed = (now - bucket.lastRefill) / 60000; // 분 단위
  const refill = Math.floor(elapsed * bucket.refillRate);
  if (refill > 0) {
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  // 토큰 소비 검사
  if (bucket.tokens < cost) {
    const waitMinutes = Math.ceil((cost - bucket.tokens) / bucket.refillRate);
    return {
      allowed: false,
      currentTokens: bucket.tokens,
      message: `AI API 호출 한도 초과. 약 ${waitMinutes}분 후에 다시 시도하세요.`,
    };
  }

  // 토큰 소비
  bucket.tokens -= cost;
  return { allowed: true, currentTokens: bucket.tokens };
}

/**
 * AI API 제한 체크 미들웨어
 * authenticateToken + consumeAiToken 결합
 */
async function aiApiLimiter(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const result = consumeAiToken(user.id, 1);
    if (!result.allowed) {
      return res.status(429).json({
        error: 'AI API 한도 초과',
        message: result.message,
        remainingTokens: result.currentTokens,
      });
    }

    req.user = { id: user.id, email: user.email };
    req.remainingTokens = result.currentTokens;
    next();
  } catch (err) {
    return res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
}

// ──────────────────────────────────────────────
// Input Sanitization 미들웨어
// ──────────────────────────────────────────────

/**
 * XSS 방지를 위한 기본 입력 정화
 * HTML 태그 및 특수 문자를 이스케이프
 */
function sanitizeInput(obj) {
  if (typeof obj === 'string') {
    return obj
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/&(?!#?\w+;)/g, '&amp;');
  }
  if (Array.isArray(obj)) { return obj.map(sanitizeInput); }
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return obj;
}

function sanitizeBody(req, res, next) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
}

// ──────────────────────────────────────────────
// Auth Middleware (기존)
// ──────────────────────────────────────────────
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '인증 토큰이 필요합니다.',
        message: 'Authorization: Bearer <token> 헤더를 포함해주세요.',
      });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({
        error: '유효하지 않거나 만료된 토큰입니다.',
        message: error?.message || '다시 로그인해주세요.',
      });
    }
    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    return res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
}

// ──────────────────────────────────────────────
// API 엔드포인트
// ──────────────────────────────────────────────

// 입력 정화 적용할 API만 선택적으로 적용
app.use('/api', sanitizeBody);
app.use('/api', apiLimiter);

app.get('/', (req, res) => {
  res.json({
    name: 'EasyKR Backend API',
    version: '1.0.0',
    status: 'running',
    debug: DEBUG,
    timestamp: new Date().toISOString(),
  });
});

app.get('/ping', (req, res) => {
  res.json({
    message: 'pong',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ──────────────────────────────────────────────
// Auth 상태 체크 (소셜 로그인 제어)
// ──────────────────────────────────────────────

/**
 * GET /api/auth/status
 * DEBUG 모드 여부 반환 → 프론트엔드에서 소셜 로그인 버튼 숨김
 */
app.get('/api/auth/status', (req, res) => {
  res.json({
    debug: DEBUG,
    socialLoginEnabled: !DEBUG,
    message: DEBUG
      ? '[DEBUG 모드] 소셜 로그인이 비활성화되었습니다. 이메일/비밀번호로만 로그인 가능합니다.'
      : '모든 로그인 방식이 활성화되었습니다.',
  });
});

// ──────────────────────────────────────────────
// 이메일 인증 API
// ──────────────────────────────────────────────

/**
 * POST /api/auth/send-verification
 * 이메일 인증 코드 발송
 * Supabase Auth의 signInWithOtp 또는 sendVerificationEmail 사용
 */
app.post('/api/auth/send-verification', async (req, res) => {
  try {
    const { email, type = 'signup' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: '이메일 주소가 필요합니다.' });
    }
    
    // Supabase를 통해 이메일 인증 발송
    // type: 'signup' | 'recovery' | 'email_change'
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: type === 'signup',
        data: { type },
      }
    });
    
    if (error) {
      console.error('[Email Verification] 인증 코드 발송 실패:', error);
      return res.status(400).json({ 
        error: '인증 코드 발송에 실패했습니다.',
        detail: error.message 
      });
    }
    
    res.json({ 
      message: '인증 코드가 이메일로 발송되었습니다.',
      expiresIn: '1시간'
    });
  } catch (err) {
    console.error('[POST /api/auth/send-verification]', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

/**
 * POST /api/auth/verify-code
 * 이메일 인증 코드 검증
 */
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code, type = 'signup' } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: '이메일과 인증 코드가 필요합니다.' });
    }
    
    // OTP 코드 검증
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: type === 'signup' ? 'signup' : 'email',
    });
    
    if (error) {
      console.error('[Email Verification] 코드 검증 실패:', error);
      return res.status(400).json({ 
        error: '인증 코드가 유효하지 않거나 만료되었습니다.',
        detail: error.message 
      });
    }
    
    // 인증 성공 시 세션 정보 반환
    res.json({ 
      message: '이메일 인증이 완료되었습니다.',
      session: data.session,
      user: data.user
    });
  } catch (err) {
    console.error('[POST /api/auth/verify-code]', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

/**
 * POST /api/auth/resend-verification
 * 이메일 인증 코드 재발송
 */
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: '이메일 주소가 필요합니다.' });
    }
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    
    if (error) {
      return res.status(400).json({ 
        error: '인증 코드 재발송에 실패했습니다.',
        detail: error.message 
      });
    }
    
    res.json({ message: '인증 코드가 재발송되었습니다.' });
  } catch (err) {
    console.error('[POST /api/auth/resend-verification]', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// ──────────────────────────────────────────────
// 프로필 API
// ──────────────────────────────────────────────
app.get('/api/profiles', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error?.code === 'PGRST116') {
      return res.json({ data: null, message: '프로필이 아직 생성되지 않았습니다.' });
    }
    if (error) throw error;

    res.json({ data, message: '프로필 조회 성공' });
  } catch (err) {
    console.error('[GET /api/profiles]', err);
    res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.', detail: err.message });
  }
});

app.post('/api/profiles', authenticateToken, async (req, res) => {
  try {
    const { name, role, native_language } = req.body;
    if (!name || !role || !native_language) {
      return res.status(400).json({ error: '필수 필드 누락', required: ['name', 'role', 'native_language'] });
    }

    const validRoles = ['student', 'teacher', 'parent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `role은 ${validRoles.join(', ')} 중 하나여야 합니다.` });
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: req.user.id, name, role, native_language })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data, message: '프로필이 저장되었습니다.' });
  } catch (err) {
    console.error('[POST /api/profiles]', err);
    res.status(500).json({ error: '데이터 저장 중 오류', detail: err.message });
  }
});

// ──────────────────────────────────────────────
// 번역 API
// ──────────────────────────────────────────────
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
    console.error('[GET /api/translations]', err);
    res.status(500).json({ error: '데이터 조회 중 오류', detail: err.message });
  }
});

app.post('/api/translations', authenticateToken, async (req, res) => {
  try {
    const { type, source_text, target_lang, result_text } = req.body;
    if (!type || !target_lang) {
      return res.status(400).json({ error: '필수 필드 누락', required: ['type', 'target_lang'] });
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
    console.error('[POST /api/translations]', err);
    res.status(500).json({ error: '데이터 저장 중 오류', detail: err.message });
  }
});

// ──────────────────────────────────────────────
// 대화 API
// ──────────────────────────────────────────────
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
    res.status(500).json({ error: '데이터 조회 중 오류', detail: err.message });
  }
});

app.post('/api/dialogs', authenticateToken, async (req, res) => {
  try {
    const { mode, messages } = req.body;
    if (!mode || !messages) {
      return res.status(400).json({ error: '필수 필드 누락', required: ['mode', 'messages'] });
    }

    const { data, error } = await supabase
      .from('dialogs')
      .insert({ user_id: req.user.id, mode, messages })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data, message: '대화 기록이 저장되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: '데이터 저장 중 오류', detail: err.message });
  }
});

// ──────────────────────────────────────────────
// 교과서 API
// ──────────────────────────────────────────────
app.get('/api/textbooks', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('textbooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data, message: '교과서 목록 조회 성공' });
  } catch (err) {
    res.status(500).json({ error: '데이터 조회 중 오류', detail: err.message });
  }
});

// ──────────────────────────────────────────────
// AI API (rate limited per account) — 샘플
// ──────────────────────────────────────────────
app.post('/api/ai/translate', aiApiLimiter, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: '번역할 텍스트가 필요합니다.' });
    }

    // TODO: 실제 AI API 호출 구현
    res.json({
      message: 'AI 번역 요청이 접수되었습니다.',
      remainingTokens: req.remainingTokens,
    });
  } catch (err) {
    res.status(500).json({ error: 'AI 처리 중 오류', detail: err.message });
  }
});

// ──────────────────────────────────────────────
// Keep-Alive: Render & Supabase 잠자기 방지
// ──────────────────────────────────────────────

// Render: 10분마다 self-ping
cron.schedule('*/10 * * * *', async () => {
  try {
    const pingUrl = `${SERVER_URL}/ping`;
    console.log(`[Keep-Alive] Pinging ${pingUrl}`);
    const response = await fetch(pingUrl);
    const data = await response.json();
    console.log(`[Keep-Alive] ✅ ${response.status} — ${data.message} at ${data.timestamp}`);
  } catch (err) {
    console.error('[Keep-Alive] ❌ Ping 실패:', err.message);
  }
});

// Supabase DB: 매일 자정 SELECT 1
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('[Supabase Keep-Alive] DB 활성화 쿼리 실행 중...');
    const { data, error } = await supabaseAdmin.from('textbooks').select('id').limit(1);

    if (error) {
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
  if (DEBUG) console.log('  🛡️ [DEBUG 모드] — 소셜 로그인 비활성화됨');
  console.log(`  🛡️ Security: Helmet + Rate Limit + Input Sanitization`);
  console.log(`  🛡️ AI API Rate Limit: 계정당 100토큰/1분당 10재충전`);
  console.log(`  🛡️ 전역 Rate Limit: IP당 15분/100요청`);
  console.log('═══════════════════════════════════════════════');
});
