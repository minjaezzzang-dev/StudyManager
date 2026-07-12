# dahamkee-classroom - Work Plan

## TL;DR (For humans)

**What you'll get:** TypeScript 모노레포 (pnpm + Turborepo) 기반으로, Supabase 백엔드 (Postgres + pgvector + 6 Edge Functions), Expo/Next.js 클라이언트, 22개 화면 ( mobile 13 + web 9), 완전한 AI 기능 (GPT-5.6 Luna + Realtime-Whisper/Translate + tts-1 + Vision OCR)이 구현된 교육 앱 프로젝트. 디자인은 Soft Minimal (#FF9B82 + #84DCC6), 소셜 로그인이 포함됨.

**Why this approach:** Clean Architecture로 domain layer를 분리해 AI/DB 교체 시 화면을 바꾸지 않고 유지. 모든 AI 호출은 Edge Functions에서 처리해 API 키 노출 위험을 없앰. Supabase pgvector로 별도 벡터DB 없이 RAG 구현. Expo Router와 Next.js App Router로 파일 기반 네비게이션을 통일해 코드 재사용.

**What it will NOT do:** Reachy Mini 로봇(M6)은 다음 계획으로 분리. 결제 기능 없이 무료 교육 목적. 완전 오프라인 온디바이스 번역 구현 안 함 (하이브리드 클라우드 + 로컬 STT). 실시간 동시통역은 구현 안 하고 문장 단위 순차 통역만. API 키를 클라이언트 코드에 하드코딩하지 않음.

**Effort:** Large
**Risk:** Low - Clear Scope: docs/ 4개 파일에 명확한 스펙 존재, GPT-5.6 Luna + Realtime models로 기술적 불확실성 낮음
**Decisions to sanity-check:** 디자인 시스템 (Soft Minimal colors), 언어 지원 (4개 instead of 6), 로봇 제외 결정은 user가 명시적으로 확인함.

Your next move: Approve to start implementation.

---

> TL;DR (machine): <1 line - effort, risk, deliverables>

## Scope
### Must have
- TypeScript 모노레포 (pnpm workspaces + Turborepo): apps/mobile, apps/web, packages/domain, packages/shared, supabase/
- Supabase 백엔드: Postgres + pgvector + Auth + Storage + 6 Edge Functions
- 모바일 앱 (Expo Router): 13개 화면 — Splash, Auth Landing, Login, SignUp, Main, Translate(F1), Interpret(F2), Debate(F3), Persona(F4), Notice(F7), Records(F6), RecordDetail, Settings, TextbookIngest(교사), PersonaAdmin(교사)
- 웹 앱 (Next.js App Router): 9개 화면 — Login, Dashboard, Translate, Interpret, Debate, Persona, Notice, Records, Admin
- 소셜 로그인: Google, Apple, Facebook, X + 이메일/비밀번호 (Supabase Auth)
- 디자인 시스템: Soft Minimal — Primary #FF9B82 (Soft Coral), Accent #84DCC6 (Pastel Mint), Quicksand/Nunito 폰트, 20px border radius
- AI: GPT-5.6 Luna (LLM), GPT-Realtime-Whisper (STT), GPT-Realtime-Translate (통역), tts-1 (TTS), text-embedding-3-small (임베딩), Google Cloud Vision (OCR)
- 보안: API 키 서버 전용, RLS, JWT 인증
- .env.example 파일 (모든 환경변수 템플릿)

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Reachy Mini 로봇(M6) — 이 계획에서 제외, 나중에 별도 진행
- 결제/상업 배포 기능
- 완전 오프라인 온디바이스 번역
- 실시간 동시통역 (문장 단위 순차 통역만)
- API 키를 클라이언트 코드에 하드코딩
- service_role 키를 클라이언트에 노출
- expo-av 사용 (deprecated → expo-audio 사용)
- ivfflat 인덱스 (HNSW 사용)

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after + Vitest (packages), Jest/Expo (mobile), Playwright (web E2E)
- Evidence: .omo/evidence/task-<N>-dahamkee-classroom.<ext>
- LSP diagnostics: every changed file must have ZERO new errors
- Build: `pnpm turbo build` must exit 0
- Type check: `pnpm turbo check-types` must exit 0
- Supabase migrations: `supabase db push --dry-run` must succeed
- Edge Functions: `supabase functions serve` + curl smoke test per function
- Mobile: `pnpm --filter mobile start` + Expo Go manual smoke test
- Web: `pnpm --filter web dev` + browser manual smoke test

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means under-split.

- **Wave 1** (T1-T6): 모노레포 부트스트랩 — pnpm, Turborepo, tsconfig, packages/domain, packages/shared, .env.example
- **Wave 2** (T7-T10): Supabase 기반 — DB migrations, RLS, Storage 버킷, 로컬 개발 환경
- **Wave 3** (T11-T16): Edge Functions 6개 — translate, interpret, rag-ingest, persona, chat-debate, notice-translate
- **Wave 4** (T17-T23): 모바일 앱 MVP — Expo 초기화, 디자인 시스템, Auth(Splash/Landing/Login/SignUp), MainScreen, F1 Translate, F2 Interpret
- **Wave 5** (T24-T29): 모바일 앱 에이전트 — F3 Debate, F4 Persona, F6 Records, F7 Notice, 교사 화면 2개, Settings
- **Wave 6** (T30-T35): 웹 앱 — Next.js 초기화, 디자인 시스템, Auth, Dashboard, Translate+Interpret, Debate+Persona+Notice+Records+Admin
- **Wave 7** (F1-F4): 최종 검증

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1 (루트 package.json + pnpm) | — | T2-T6 | — |
| T2 (Turborepo config) | T1 | T3-T6 | T3-T6 |
| T3 (tsconfig base) | T1 | T4-T6 | T2, T4-T6 |
| T4 (packages/domain) | T1, T3 | T7, T11-T16, T17+ | T2, T3, T5, T6 |
| T5 (packages/shared) | T1, T3 | T17+ | T2, T3, T4, T6 |
| T6 (.env.example) | T1 | T7, T17+ | T2-T5 |
| T7 (DB migrations SQL) | T4 | T8-T10, T11-T16 | T8-T10 |
| T8 (RLS policies) | T7 | T11-T16 | T9, T10 |
| T9 (Storage buckets) | T7 | T11-T16 | T8, T10 |
| T10 (로컬 Supabase 검증) | T7-T9 | T11-T16 | — |
| T11 (translate EF) | T4, T7-T10 | T17+ | T12-T16 |
| T12 (interpret EF) | T4, T7-T10 | T17+ | T11, T13-T16 |
| T13 (rag-ingest EF) | T4, T7-T10 | T14 | T11, T12, T15, T16 |
| T14 (persona EF) | T13 | T17+ | T11, T12, T15, T16 |
| T15 (chat-debate EF) | T4, T7-T10 | T17+ | T11, T12, T14, T16 |
| T16 (notice-translate EF) | T4, T7-T10 | T17+ | T11-T15 |
| T17 (Expo 초기화) | T4, T5, T6 | T18-T29 | T30 (web init) |
| T18 (디자인 시스템) | T17 | T19-T29 | T30-T35 |
| T19 (Auth 화면 4개) | T17, T18 | T20 | T30-T35 |
| T20 (MainScreen) | T19 | T21-T29 | T30-T35 |
| T21 (F1 Translate) | T11, T17, T18, T20 | — | T22-T29, T30-T35 |
| T22 (F2 Interpret) | T12, T17, T18, T20 | — | T21, T23-T29, T30-T35 |
| T23 (F3 Debate) | T15, T17, T18, T20 | — | T21, T22, T24-T29 |
| T24 (F4 Persona) | T14, T17, T18, T20 | — | T21-T23, T25-T29 |
| T25 (F6 Records) | T17, T18, T20 | — | T21-T24, T26-T29 |
| T26 (F7 Notice) | T16, T17, T18, T20 | — | T21-T25, T27-T29 |
| T27 (TextbookIngest 교사) | T13, T17, T18, T20 | — | T21-T26, T28, T29 |
| T28 (PersonaAdmin 교사) | T17, T18, T20 | — | T21-T27, T29 |
| T29 (Settings) | T17, T18, T20 | — | T21-T28 |
| T30 (Next.js 초기화) | T4, T5, T6 | T31-T35 | T17-T29 |
| T31 (웹 디자인 시스템) | T30 | T32-T35 | T17-T29 |
| T32 (웹 Auth + Dashboard) | T30, T31 | T33-T35 | T17-T29 |
| T33 (웹 Translate + Interpret) | T11, T12, T30, T31 | — | T17-T29, T34, T35 |
| T34 (웹 Debate + Persona) | T14, T15, T30, T31 | — | T17-T29, T33, T35 |
| T35 (웹 Notice + Records + Admin) | T16, T30, T31 | — | T17-T29, T33, T34 |

- [ ] 1. 루트 package.json + pnpm + Turborepo 초기화
  What to do: pnpm init으로 루트 package.json 작성, turbo.json (build/lint/check-types/dev task config), pnpm-workspace.yaml (apps/*, packages/*)
  Must NOT do: pnpm 버전 9+ 강제, root package.json에 직접 의존성 추가하지 않음 (workspace:*만)
  Parallelization: Wave 1, first | Blocked by: — | Blocks: 2-6
  References: Context7 /vercel/turborepo, /websites/pnpm
  Acceptance: `pnpm install` success, `turbo --help` 0, `pnpm list -r` shows apps/mobile, apps/web, packages/domain, packages/shared, supabase/functions, supabase/migrations
  QA: happy — pnpm install succeeds; failure — verify Node.js >=18, pnpm >=9 installed; Evidence .omo/evidence/task-1-dahamkee-classroom.<ext>
  Commit: Y | chore: initialize monorepo root with pnpm and Turborepo
- [ ] 2. Turborepo config (turbo.json) + root scripts
  What to do: turbo.json with build/dependsOn["^build"], lint/check-types/dev tasks; package.json scripts: build, dev, lint, format, check-types
  Must NOT do: Turborepo cache disabled for dev tasks, transpilePackages에 모든 workspace 설정 (apps/*, packages/*)
  Parallelization: Wave 1, second | Blocked by: 1 | Blocks: 3-6
  References: Context7 /vercel/turborepo turbo.json example
  Acceptance: `turbo run build` exits 0, `turbo run dev` starts all apps with no errors
  QA: happy — turbo run build succeeds; failure — check tsconfig.json paths; Evidence .omo/evidence/task-2-dahamkee-classroom.<ext>
  Commit: Y | chore: add Turborepo config and root scripts
- [ ] 3. tsconfig base + tsconfig root
  What to do: tsconfig.json (compilerOptions: strict, esmoduleInterop, paths), apps/mobile/tsconfig.json, apps/web/tsconfig.json, packages/*/tsconfig.json에 대한 base reference
  Must NOT do: allowJs: true 금지, skipLibCheck: true 설정
  Parallelization: Wave 1, third | Blocked by: 1 | Blocks: 4-6
  References: Context7 /vercel/next.js monorepo tsconfigPath
  Acceptance: `npx tsc --noEmit` in each workspace exits 0 with strict type checking
  QA: happy — npx tsc succeeds; failure — check for circular imports or direct DB/AI imports; Evidence .omo/evidence/task-3-dahamkee-classroom.<ext>
  Commit: Y | chore: add TypeScript configurations for monorepo
- [ ] 4. packages/domain (TypeScript entities, RLS, usecases, ports)
  What to do: entities (User, Textbook, TextChunk, Persona, Translation, Dialog), usecases (TranslateText, InterpretSpeech, AskPersona...), ports (TranslationPort, RagPort), types (Language, Mode, Type)
  Must NOT do: domain에 AI/DB 직접 import 안 함 (ports 인터페이스만), domain을 None Import 안 함
  Parallelization: Wave 1, fourth | Blocked by: 3 | Blocks: 5-6, 7, 11-16, 17+
  References: docs/다함께교실_아키텍처_v1.md 3.3 모노레포 폴더 구조 5. 데이터 모델
  Acceptance: `pnpm --filter domain check-types` exits 0, `pnpm --filter domain build` exits 0
  QA: happy — domain builds; failure — check for circular imports or direct DB/AI imports; Evidence .omo/evidence/task-4-dahamkee-classroom.<ext>
  Commit: Y | feat(domain): add entities, usecases, ports for clean architecture
- [ ] 5. packages/shared (TypeScript shared constants, utils, validation)
  What to do: constants (LANGS: 6개, UI_COLORS: #FF9B82, #84DCC6), types (Language, LanguageCode, LanguageName), utils (formatDate, validateEmail, 8-char password), validation (zod schemas)
  Must NOT do: shared에 React/Expo/Next.js import 안 함 (pure TS only)
  Parallelization: Wave 1, fifth | Blocked by: 3 | Blocks: 6, 17+ | Can parallelize with 4
  References: docs/다함께교실_PRD_v1.md 6. 데이터 모델 5. 사용자(페르소나)
  Acceptance: `pnpm --filter shared check-types` exits 0, `pnpm --filter shared build` exits 0
  QA: happy — shared builds; failure — check for framework imports; Evidence .omo/evidence/task-5-dahamkee-classroom.<ext>
  Commit: Y | feat(shared): add shared constants, types, utils, validation
- [ ] 6. .env.example 생성 (모든 환경변수 템플릿)
  What to do: .env.example 파일 작성 — Supabase(6), OpenAI(7), Google Vision(1), OAuth(4), Client(4), Edge Function(1), Dev(1) = 23개 변수
  Must NOT do: 실제 API 키/비밀번호 포함 X, .env.local 생성하지 않음 (.env* in .gitignore)
  Parallelization: Wave 1, sixth | Blocked by: 1 | Blocks: 7, 11-16, 17+
  References: docs/다함께교실_PRD_v1.md 7. 보안 원칙 (API 키 서버 전용)
  Acceptance: .env.example 존재, 실제 값 없이 플레이스홀더만, .gitignore에 .env* 포함
  QA: happy — .env.example exists with placeholders; failure — verify missing variables; Evidence .omo/evidence/task-6-dahamkee-classroom.<ext>
  Commit: Y | docs: add .env.example with all environment variables template
- [ ] 7. DB migrations SQL (Tables: users, textbooks, text_chunks, personas, translations, dialogs, notices, records)
  What to do: supabase/migrations 폴더에 SQL 파일 작성. users (auth.users 연동), textbooks (id, title, teacher_id), text_chunks (id, textbook_id, content, embedding vector(1536)), personas (id, name, description, system_prompt), translations (id, user_id, source, target, result), dialogs (id, user_id, persona_id, message, response), notices (id, title, content, translated_content), records (id, user_id, type, data) 테이블 생성. HNSW 인덱스 추가.
  Must NOT do: ivfflat 인덱스 사용 금지 (HNSW 사용), public 스키마 외에 생성 금지.
  Parallelization: Wave 2 | Blocked by: 4, 6 | Blocks: 8-10, 11-16
  References: packages/domain/src/entities, supabase/migrations
  Acceptance: `supabase db push --dry-run` success, `supabase db reset` success
  QA scenarios: happy — migrations apply; failure — check pgvector extension; Evidence .omo/evidence/task-7-dahamkee-classroom.sql
  Commit: Y | feat(supabase): add database migrations for all entities
- [ ] 8. RLS policies (User-owned data, public personas, teacher-only textbooks)
  What to do: 모든 테이블에 Row Level Security 정책 적용. users (본인만), textbooks (교사만 CRUD, 학생은 R), text_chunks (학생 R), personas (전체 R), translations/dialogs/records (본인만 CRUD), notices (전체 R).
  Must NOT do: service_role 없이 bypass 금지, 정책 없는 테이블 방치 금지.
  Parallelization: Wave 2 | Blocked by: 7 | Blocks: 11-16
  References: supabase/migrations
  Acceptance: `supabase db reset` 후 `select * from translations` 시 anon 키로 빈 결과 확인
  QA scenarios: happy — RLS works; failure — check policy syntax; Evidence .omo/evidence/task-8-dahamkee-classroom.sql
  Commit: Y | feat(supabase): add RLS policies for security
- [ ] 9. Storage buckets (ocr-images, tts-audio)
  What to do: `ocr-images` (교과서 스캔 이미지), `tts-audio` (생성된 음성 파일) 버킷 생성. public access 설정 (필요 시).
  Must NOT do: 버킷 이름 오타 주의, 용량 제한 설정 누락 금지.
  Parallelization: Wave 2 | Blocked by: 7 | Blocks: 11-16
  References: supabase/migrations
  Acceptance: `supabase storage ls` shows ocr-images, tts-audio
  QA scenarios: happy — buckets created; failure — check storage permissions; Evidence .omo/evidence/task-9-dahamkee-classroom.json
  Commit: Y | feat(supabase): add storage buckets for OCR and TTS
- [ ] 10. 로컬 Supabase 검증 (CLI setup, seed data)
  What to do: `supabase start`로 로컬 환경 구동, seed.sql 작성 (기본 페르소나 4종: English, Korean, Chinese, Vietnamese 원어민 에이전트), `supabase status` 확인.
  Must NOT do: 실제 API 키 seed에 포함 금지.
  Parallelization: Wave 2 | Blocked by: 7-9 | Blocks: 11-16
  References: supabase/seed.sql
  Acceptance: `supabase status` shows all services running, `supabase db reset` applies seed data
  QA scenarios: happy — local setup works; failure — Docker not running; Evidence .omo/evidence/task-10-dahamkee-classroom.txt
  Commit: Y | chore(supabase): setup local development environment and seed data
- [ ] 11. translate EF (GPT-5.6 Luna, GPT-Realtime-Translate)
  What to do: `supabase/functions/translate` 작성. GPT-5.6 Luna 사용, 4개 언어(EN, KO, ZH, VI) 지원. GPT-Realtime-Translate 연동 (음성 번역 시).
  Must NOT do: OpenAI 키 하드코딩 금지 (env 사용), 텍스트 길이 제한 누락 금지.
  Parallelization: Wave 3 | Blocked by: 4, 7-10 | Blocks: 17+
  References: packages/domain/src/usecases/TranslateText.ts
  Acceptance: `supabase functions serve` + curl test returns translated text
  QA scenarios: happy — translation success; failure — invalid language code; Evidence .omo/evidence/task-11-dahamkee-classroom.json
  Commit: Y | feat(supabase): add translate edge function
- [ ] 12. interpret EF (GPT-Realtime-Whisper, GPT-Realtime-Translate)
  What to do: `supabase/functions/interpret` 작성. GPT-Realtime-Whisper (STT) + GPT-Realtime-Translate (Translation) + tts-1 (TTS) 연동. 문장 단위 순차 통역.
  Must NOT do: 실시간 동시통역 구현 금지 (순차 통역만), 오디오 포맷 변환 오류 주의.
  Parallelization: Wave 3 | Blocked by: 4, 7-10 | Blocks: 17+
  References: packages/domain/src/usecases/InterpretSpeech.ts
  Acceptance: curl with audio file returns translated audio URL
  QA scenarios: happy — interpretation success; failure — audio too long; Evidence .omo/evidence/task-12-dahamkee-classroom.json
  Commit: Y | feat(supabase): add interpret edge function
- [ ] 13. rag-ingest EF (Google Cloud Vision OCR, text-embedding-3-small, pgvector)
  What to do: `supabase/functions/rag-ingest` 작성. Google Cloud Vision OCR로 이미지 텍스트 추출, text-embedding-3-small로 벡터화, pgvector(text_chunks)에 저장.
  Must NOT do: OCR 결과 정제 누락 금지, 중복 인제스트 방지 로직 포함.
  Parallelization: Wave 3 | Blocked by: 4, 7-10 | Blocks: 14
  References: packages/domain/src/usecases/IngestTextbook.ts
  Acceptance: curl with image returns success, DB has new chunks
  QA scenarios: happy — ingest success; failure — OCR failed; Evidence .omo/evidence/task-13-dahamkee-classroom.json
  Commit: Y | feat(supabase): add rag-ingest edge function
- [ ] 14. persona EF (AskPersona usecase, RAG context)
  What to do: `supabase/functions/persona` 작성. AskPersona usecase 구현. RAG context(text_chunks) 검색 후 GPT-5.6 Luna로 답변 생성.
  Must NOT do: 컨텍스트 없는 답변 금지, 페르소나 설정 무시 금지.
  Parallelization: Wave 3 | Blocked by: 13 | Blocks: 17+
  References: packages/domain/src/usecases/AskPersona.ts
  Acceptance: curl with question returns RAG-based answer
  QA scenarios: happy — persona answers; failure — no relevant context; Evidence .omo/evidence/task-14-dahamkee-classroom.json
  Commit: Y | feat(supabase): add persona edge function
- [ ] 15. chat-debate EF (GPT-5.6 Luna, debate logic)
  What to do: `supabase/functions/chat-debate` 작성. GPT-5.6 Luna 사용, 디베이트 로직(주제 설정, 찬반 토론, 피드백) 구현.
  Must NOT do: 대화 맥락 유실 주의, 토론 규칙 위반 방지.
  Parallelization: Wave 3 | Blocked by: 4, 7-10 | Blocks: 17+
  References: packages/domain/src/usecases/ChatDebate.ts
  Acceptance: curl with message returns debate response
  QA scenarios: happy — debate continues; failure — context window exceeded; Evidence .omo/evidence/task-15-dahamkee-classroom.json
  Commit: Y | feat(supabase): add chat-debate edge function
- [ ] 16. notice-translate EF (Translate notice for all students)
  What to do: `supabase/functions/notice-translate` 작성. 공지사항 작성 시 4개 언어로 자동 번역하여 저장.
  Must NOT do: 번역 품질 저하 주의, 원문 훼손 금지.
  Parallelization: Wave 3 | Blocked by: 4, 7-10 | Blocks: 17+
  References: packages/domain/src/usecases/TranslateNotice.ts
  Acceptance: curl with notice returns 4 translations
  QA scenarios: happy — notice translated; failure — translation service down; Evidence .omo/evidence/task-16-dahamkee-classroom.json
  Commit: Y | feat(supabase): add notice-translate edge function
- [ ] 17. Expo 초기화 (apps/mobile)
  What to do: `npx create-expo-app apps/mobile --template tabs`, Expo Router 설정, `packages/domain`, `packages/shared` workspace 연결.
  Must NOT do: expo-av 사용 금지 (expo-audio 사용), native directory 직접 수정 지양.
  Parallelization: Wave 4 | Blocked by: 4, 5, 6 | Blocks: 18-29
  References: Context7 /expo/expo-router
  Acceptance: `pnpm --filter mobile start` shows Expo Go QR code
  QA scenarios: happy — app starts; failure — dependency conflict; Evidence .omo/evidence/task-17-dahamkee-classroom.txt
  Commit: Y | chore(mobile): initialize Expo app with Expo Router
- [ ] 18. 디자인 시스템 (Soft Minimal)
  What to do: React Native Paper 설정, Soft Minimal 테마 적용 (#FF9B82, #84DCC6), Quicksand/Nunito 폰트 로드, 20px border radius 공통 스타일 정의.
  Must NOT do: 기본 테마 그대로 사용 금지, 폰트 로딩 전 렌더링 방지.
  Parallelization: Wave 4 | Blocked by: 17 | Blocks: 19-29
  References: docs/다함께교실_PRD_v1.md 4. 디자인 시스템
  Acceptance: App shows themed components with correct colors and fonts
  QA scenarios: happy — theme applied; failure — font not found; Evidence .omo/evidence/task-18-dahamkee-classroom.png
  Commit: Y | feat(mobile): apply Soft Minimal design system
- [ ] 19. Auth 화면 4개 (Splash, Auth Landing, Login, SignUp)
  What to do: Splash (로고 애니메이션), Auth Landing (소셜 로그인 버튼), Login (이메일/비번), SignUp (회원가입) 화면 구현. Supabase Auth 연동.
  Must NOT do: 비밀번호 평문 노출 금지, 유효성 검사 누락 금지.
  Parallelization: Wave 4 | Blocked by: 17, 18 | Blocks: 20
  References: apps/mobile/app/(auth)
  Acceptance: Login/SignUp flow works with Supabase Auth
  QA scenarios: happy — login success; failure — wrong password; Evidence .omo/evidence/task-19-dahamkee-classroom.png
  Commit: Y | feat(mobile): add authentication screens
- [ ] 20. MainScreen (Tab navigation)
  What to do: Bottom Tab Navigation (Translate, Interpret, Debate, Persona, Notice, Records, Settings) 구성. 각 기능별 카드 UI 구현.
  Must NOT do: 복잡한 네비게이션 구조 지양, 아이콘 미스매치 주의.
  Parallelization: Wave 4 | Blocked by: 19 | Blocks: 21-29
  References: apps/mobile/app/(tabs)
  Acceptance: Tab switching works, Main screen shows feature cards
  QA scenarios: happy — navigation works; failure — screen not found; Evidence .omo/evidence/task-20-dahamkee-classroom.png
  Commit: Y | feat(mobile): add main screen and tab navigation
- [ ] 21. F1 Translate 화면
  What to do: 카메라 연동 (expo-camera), 텍스트 입력, 번역 결과 표시. `translate` EF 호출.
  Must NOT do: 카메라 권한 요청 누락 금지, 결과 로딩 상태 미표시 금지.
  Parallelization: Wave 4 | Blocked by: 11, 17, 18, 20 | Blocks: —
  References: apps/mobile/app/(tabs)/translate
  Acceptance: Photo/Text translation returns result from EF
  QA scenarios: happy — translation success; failure — camera denied; Evidence .omo/evidence/task-21-dahamkee-classroom.png
  Commit: Y | feat(mobile): add F1 Translate screen
- [ ] 22. F2 Interpret 화면
  What to do: 음성 녹음 (expo-audio), 실시간 레벨 미터, 순차 통역 결과 재생. `interpret` EF 호출.
  Must NOT do: 마이크 권한 요청 누락 금지, 오디오 재생 중단 오류 주의.
  Parallelization: Wave 4 | Blocked by: 12, 17, 18, 20 | Blocks: —
  References: apps/mobile/app/(tabs)/interpret
  Acceptance: Voice input returns translated audio and plays it
  QA scenarios: happy — interpretation success; failure — mic denied; Evidence .omo/evidence/task-22-dahamkee-classroom.png
  Commit: Y | feat(mobile): add F2 Interpret screen
- [ ] 23. F3 Debate 화면
  What to do: 채팅 UI 구현, AI 디베이트 파트너와 대화. `chat-debate` EF 호출.
  Must NOT do: 메시지 순서 꼬임 주의, 키보드 가림 현상 방지.
  Parallelization: Wave 4 | Blocked by: 15, 17, 18, 20 | Blocks: —
  References: apps/mobile/app/(tabs)/debate
  Acceptance: Chatting with AI debate partner works
  QA scenarios: happy — debate success; failure — network error; Evidence .omo/evidence/task-23-dahamkee-classroom.png
  Commit: Y | feat(mobile): add F3 Debate screen
- [ ] 24. F4 Persona 화면
  What to do: 페르소나 선택 리스트, 질문 입력, RAG 기반 답변 표시. `persona` EF 호출.
  Must NOT do: 페르소나 이미지 누락 금지, 답변 로딩 중 인터랙션 차단.
  Parallelization: Wave 5 | Blocked by: 14, 17, 18, 20 | Blocks: —
  References: apps/mobile/app/(tabs)/persona
  Acceptance: Asking persona returns RAG-based answer
  QA scenarios: happy — persona answers; failure — no context found; Evidence .omo/evidence/task-24-dahamkee-classroom.png
  Commit: Y | feat(mobile): add F4 Persona screen
- [ ] 25. F6 Records 화면
  What to do: 학습 기록 리스트 (번역, 통역, 토론, 질문), 상세 보기 화면.
  Must NOT do: 데이터 동기화 지연 주의, 빈 리스트 처리 누락 금지.
  Parallelization: Wave 5 | Blocked by: 17, 18, 20 | Blocks: —
  References: apps/mobile/app/(tabs)/records
  Acceptance: List shows past activities, detail shows content
  QA scenarios: happy — records loaded; failure — no records; Evidence .omo/evidence/task-25-dahamkee-classroom.png
  Commit: Y | feat(mobile): add F6 Records screen
- [ ] 26. F7 Notice 화면
  What to do: 공지사항 리스트, 언어별 필터링, 상세 내용 표시.
  Must NOT do: 번역본 누락 시 처리 주의, 알림 배지 미작동 금지.
  Parallelization: Wave 5 | Blocked by: 16, 17, 18, 20 | Blocks: —
  References: apps/mobile/app/(tabs)/notice
  Acceptance: Notice list shows translated titles
  QA scenarios: happy — notice loaded; failure — translation missing; Evidence .omo/evidence/task-26-dahamkee-classroom.png
  Commit: Y | feat(mobile): add F7 Notice screen
- [ ] 27. TextbookIngest (교사 화면)
  What to do: 교과서 사진 촬영/업로드, `rag-ingest` EF 호출하여 지식 베이스 구축.
  Must NOT do: 학생 계정 접근 금지 (RLS/Role 체크), 대용량 이미지 처리 주의.
  Parallelization: Wave 5 | Blocked by: 13, 17, 18, 20 | Blocks: —
  References: apps/mobile/app/teacher/ingest
  Acceptance: Uploading textbook image adds chunks to DB
  QA scenarios: happy — ingest success; failure — not a teacher; Evidence .omo/evidence/task-27-dahamkee-classroom.png
  Commit: Y | feat(mobile): add teacher textbook ingest screen
- [ ] 28. PersonaAdmin (교사 화면)
  What to do: 페르소나 생성/수정/삭제, 시스템 프롬프트 설정.
  Must NOT do: 프롬프트 인젝션 방지, 필수 필드 누락 금지.
  Parallelization: Wave 5 | Blocked by: 17, 18, 20 | Blocks: —
  References: apps/mobile/app/teacher/persona
  Acceptance: Creating persona shows up in student list
  QA scenarios: happy — persona created; failure — invalid prompt; Evidence .omo/evidence/task-28-dahamkee-classroom.png
  Commit: Y | feat(mobile): add teacher persona admin screen
- [ ] 29. Settings 화면
  What to do: 프로필 수정, 언어 설정, 로그아웃, 앱 정보.
  Must NOT do: 로그아웃 후 세션 유지 금지, 설정 저장 실패 시 알림 누락 금지.
  Parallelization: Wave 5 | Blocked by: 17, 18, 20 | Blocks: —
  References: apps/mobile/app/(tabs)/settings
  Acceptance: Profile update and logout work
  QA scenarios: happy — settings updated; failure — update failed; Evidence .omo/evidence/task-29-dahamkee-classroom.png
  Commit: Y | feat(mobile): add settings screen
- [ ] 30. Next.js 초기화 (apps/web)
  What to do: `npx create-next-app apps/web --typescript --tailwind --app`, `packages/domain`, `packages/shared` workspace 연결.
  Must NOT do: Pages Router 사용 금지 (App Router 사용), Tailwind 설정 누락 금지.
  Parallelization: Wave 6 | Blocked by: 4, 5, 6 | Blocks: 31-35
  References: Context7 /vercel/next.js
  Acceptance: `pnpm --filter web dev` starts on localhost:3000
  QA scenarios: happy — web app starts; failure — workspace link failed; Evidence .omo/evidence/task-30-dahamkee-classroom.txt
  Commit: Y | chore(web): initialize Next.js app with App Router
- [ ] 31. 웹 디자인 시스템
  What to do: Tailwind CSS 테마 설정 (Soft Minimal colors), 공통 레이아웃, 버튼/입력창 컴포넌트 구현.
  Must NOT do: 모바일과 디자인 불일치 주의, 반응형 레이아웃 누락 금지.
  Parallelization: Wave 6 | Blocked by: 30 | Blocks: 32-35
  References: apps/web/tailwind.config.ts
  Acceptance: Web app shows themed components
  QA scenarios: happy — theme applied; failure — tailwind not working; Evidence .omo/evidence/task-31-dahamkee-classroom.png
  Commit: Y | feat(web): apply Soft Minimal design system to web
- [ ] 32. 웹 Auth + Dashboard
  What to do: Login 화면, Dashboard (기능 요약, 최근 활동) 구현. Supabase Auth 연동.
  Must NOT do: 미인증 사용자 대시보드 접근 금지 (Middleware), 세션 만료 처리 누락 금지.
  Parallelization: Wave 6 | Blocked by: 30, 31 | Blocks: 33-35
  References: apps/web/app/(auth), apps/web/app/dashboard
  Acceptance: Login flow and dashboard summary work
  QA scenarios: happy — login success; failure — unauthorized access; Evidence .omo/evidence/task-32-dahamkee-classroom.png
  Commit: Y | feat(web): add web auth and dashboard
- [ ] 33. 웹 Translate + Interpret
  What to do: 텍스트 번역, 음성 통역(Web Audio API) 화면 구현. EF 호출.
  Must NOT do: 브라우저 마이크 권한 처리 누락 금지, 모바일과 기능 차이 최소화.
  Parallelization: Wave 6 | Blocked by: 11, 12, 30, 31 | Blocks: —
  References: apps/web/app/translate, apps/web/app/interpret
  Acceptance: Web translation and interpretation work
  QA scenarios: happy — success; failure — mic blocked; Evidence .omo/evidence/task-33-dahamkee-classroom.png
  Commit: Y | feat(web): add web translate and interpret screens
- [ ] 34. 웹 Debate + Persona
  What to do: 채팅 UI, 페르소나 질문 화면 구현. EF 호출.
  Must NOT do: 실시간 업데이트 누락 금지, 대화 기록 유실 주의.
  Parallelization: Wave 6 | Blocked by: 14, 15, 30, 31 | Blocks: —
  References: apps/web/app/debate, apps/web/app/persona
  Acceptance: Web debate and persona interaction work
  QA scenarios: happy — success; failure — EF error; Evidence .omo/evidence/task-34-dahamkee-classroom.png
  Commit: Y | feat(web): add web debate and persona screens
- [ ] 35. 웹 Notice + Records + Admin
  What to do: 공지사항 관리, 학습 기록 조회, 교사 전용 관리자 화면 구현.
  Must NOT do: 관리자 권한 체크 누락 금지, 데이터 테이블 페이징 누락 금지.
  Parallelization: Wave 6 | Blocked by: 16, 30, 31 | Blocks: —
  References: apps/web/app/notice, apps/web/app/records, apps/web/app/admin
  Acceptance: Admin can manage notices and view all records
  QA scenarios: happy — admin works; failure — permission denied; Evidence .omo/evidence/task-35-dahamkee-classroom.png
  Commit: Y | feat(web): add web notice, records, and admin screens

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit
- [ ] F2. Code quality review
- [ ] F3. Real manual QA
- [ ] F4. Scope fidelity

## Commit strategy

## Success criteria
