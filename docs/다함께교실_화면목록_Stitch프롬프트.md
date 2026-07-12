# 다함께교실 — 전체 화면 목록 \+ Stitch UI 프롬프트 (앱·웹 구분) v1.0

Google **Stitch**로 화면 UI를 생성하기 위한 화면별 프롬프트 모음. 영어로 입력하면 결과가 더 안정적이므로 **각 프롬프트는 영어**로 제공하고, 위에 한국어 설명을 붙였다. 화면 총계: **앱(Mobile) 13개 \+ 웹(Web) 9개 \= 22개**.

---

## 0\. 공통 디자인 시스템 (모든 프롬프트 앞에 함께 입력)

DESIGN SYSTEM for "Dahamkke Classroom", a friendly multilingual education app for

immigrant-background elementary students.

\- Mood: warm, friendly, encouraging, modern, clean, accessible for children.

\- Mascot: a cute rounded white-and-teal robot named "Dami" holding a book.

\- Primary color: teal \#14B8A6. Secondary: coral \#FF7A59. Accent: amber \#FBBF24.

  Background: \#F7FAFC. Text: \#1F2937. Success \#22C55E, Error \#EF4444.

\- Rounded corners (16-20px), soft shadows, large tap targets, generous spacing.

\- Font: Pretendard / Noto Sans KR (must render Korean, Russian, Chinese, Vietnamese,

  Uzbek, Kazakh well). Clear, friendly icons (Lucide style).

\- Always show a language selector (KR/RU/ZH/VI/UZ/KK with small flags).

\- Show loading states and friendly empty states with the Dami mascot.

6개 언어: Korean(ko), Russian(ru), Chinese(zh), Vietnamese(vi), Uzbek(uz), Kazakh(kk).

---

# A. 앱 (Mobile · React Native/Expo) — 13개 화면

모바일은 세로 화면, 하단 탭 또는 큰 버튼 중심, 한 손 사용 고려.

### A1. 로그인 (LoginScreen)

한국어 설명: 이메일/비밀번호 로그인. 마스코트와 앱 이름, 회원가입·비밀번호찾기 링크.

Mobile login screen for "Dahamkke Classroom". Centered Dami robot mascot \+ app title

and tagline "Learning together, no language barriers". Email and password fields with

rounded borders, a large teal "로그인 / Log in" button, secondary "회원가입 / Sign up"

button, and "비밀번호 찾기" text link. Language selector chips at top. Clean, airy layout.

### A2. 회원가입 (SignUpScreen)

한국어 설명: 이름·이메일·비밀번호(8자+)·모국어 선택.

Mobile sign-up screen. Fields: name, email, password (helper text "8자 이상"), confirm

password, and a "Native language" dropdown showing 6 languages with flags. Large teal

"가입하기 / Create account" button. Friendly, simple, one column.

### A3. 메인 홈 (MainScreen)

한국어 설명: 환영 인사 \+ 언어 선택 \+ 기능 6버튼(통역·번역을 가장 크게).

Mobile home screen. Top: greeting "환영합니다, {name}님" with small Dami avatar and a

language selector. A 2-column grid of 6 large feature cards with icons and labels:

1\) 교과서 번역 (camera/translate icon), 2\) 실시간 통역 (microphone), 3\) 토론 친구

(chat bubbles), 4\) 인물 인터뷰 (theater mask/person), 5\) 가정통신문 번역 (letter),

6\) 학습 기록 (chart). Make cards 1 and 2 visually largest at top. Bottom tab bar:

Home, Records, Settings.

### A4. 교과서 번역 (TranslateScreen · F1)

한국어 설명: 사진 촬영/선택 → 텍스트 추출 → 6개 언어 번역, 원문/번역 병렬.

Mobile OCR translation screen. Top: image preview frame with "사진 촬영" and "갤러리"

buttons. Middle: extracted Korean text in an editable box. A target-language selector.

"번역하기" primary button. Result shown as two stacked cards: original (Korean) and

translation (selected language) side by side vertically, each labeled. A save (bookmark)

button. Show a "번역 중..." loading state with Dami.

### A5. 실시간 통역 (InterpretScreen · F2)

한국어 설명: 두 마이크 버튼(한국어/내 언어), 말풍선 대화 로그, 음성 재생.

Mobile real-time interpreter screen for a two-person conversation. A scrolling chat log

of speech bubbles: Korean speaker on the left (blue), foreign speaker on the right (teal),

each bubble shows original \+ translated text and a small play (speaker) icon. Bottom: two

big circular mic buttons labeled "한국어 말하기" and "내 언어 말하기" that pulse when

recording. Clean, accessible, big buttons.

### A6. 토론 친구 (DebateScreen · F3)

한국어 설명: 가상 한국인 학생과 토론. 주제 선택 \+ 채팅 \+ 내 언어 입력 통역.

Mobile AI debate-partner chat screen. Top: current debate topic chip and a friendly

Korean-student avatar. A chat thread; the AI friend's messages show Korean with the

user's-language translation underneath. Bottom: text input with a language toggle and

a send button, plus 3 suggested-reply chips. Encouraging, school-friendly tone.

### A7. 인물 인터뷰 (PersonaScreen · F4)

한국어 설명: 교과서 인물과 1인칭 대화. 인물 아바타, 근거 표시, 추천 질문.

Mobile character-interview chat screen. Header shows the chosen textbook character

(e.g., portrait avatar \+ name like "흥부"). Chat bubbles where the character answers in

first person (Korean \+ user-language). Under each answer a small grey "근거: 2단원 3문단"

source tag. Bottom: input field \+ 3 suggested questions like "왜 그런 선택을 했나요?".

Warm, storybook feel.

### A8. 가정통신문 번역 (NoticeScreen · F7)

한국어 설명: 가정통신문 사진 → 다국어 번역 \+ 핵심요약 \+ QR 공유.

Mobile screen to translate a school newsletter for parents. Top: upload/take-photo area

for the notice. A multi-select of target languages. After processing: a "핵심 요약" card

(date, items to bring, due date as icons) and the full translation below. A "QR로 공유"

button that opens a QR code modal. Clean and trustworthy.

### A9. 학습 기록 목록 (RecordsScreen · F6)

한국어 설명: 번역/대화 기록 리스트 \+ 복습 도움 버튼.

Mobile learning-records list. Tabs: "번역 기록" and "대화 기록". Each row shows an icon,

short preview, language pair, and date. A floating "복습 도움 / Review help" button.

Friendly empty state with Dami when there are no records yet.

### A10. 기록 상세 (RecordDetailScreen)

한국어 설명: 기록 항목 상세 \+ 다시 듣기/재번역.

Mobile record-detail screen. Shows the full original and translated text (or full chat

transcript), language pair, timestamp. Buttons: "다시 듣기"(replay TTS), "다시 번역",

and delete. Simple reading-friendly layout with large text.

### A11. 교과서 등록·RAG (TextbookIngestScreen · 교사)

한국어 설명: 교사가 단원 텍스트 입력 → 색인. 교사 전용.

Mobile teacher screen to register textbook content for RAG. Fields: subject, grade,

unit title, and a large multiline text area for the unit passage. A "색인하기 / Index"

button. After indexing, show "n개 문단 저장됨" success with a checkmark. Indicate this

is a teacher-only screen with a small badge.

### A12. 페르소나 등록 (PersonaAdminScreen · 교사)

한국어 설명: 교사가 인물 페르소나(system prompt) 등록.

Mobile teacher screen to create a textbook-character persona. Fields: link to a textbook

unit, character name, and a multiline "성격/말투/시대 규칙 (system prompt)" box with an

example pre-filled. A "저장" button and a list of existing personas as cards. Teacher-only

badge.

### A13. 설정·프로필 (SettingsScreen)

한국어 설명: 이름·모국어 변경, 로그아웃, 개인정보 동의 관리.

Mobile settings/profile screen. Sections: profile (name, native language with edit),

app language, privacy & consent toggles (face data, records), help, and a "로그아웃"

button at the bottom. Calm, organized list layout.

---

# B. 웹 (Web · Next.js) — 9개 화면

웹은 교실 PC/태블릿 \+ 교사 관리 중심. **좌측 사이드바 내비게이션 \+ 넓은 콘텐츠 영역(데스크톱 레이아웃)**. 모바일과 기능은 같지만 레이아웃이 다르다.

### W1. 로그인 (/login)

Desktop web login page for "Dahamkke Classroom". Split layout: left panel teal with the

Dami mascot, app name and tagline; right panel a centered card with email/password,

"로그인" button, sign-up and reset links, and a language selector. Modern SaaS look.

### W2. 대시보드 홈 (/)

한국어 설명: 좌측 사이드바 \+ 기능 카드 \+ 최근 활동.

Desktop dashboard for the app. Left sidebar nav with items: 홈, 교과서 번역, 실시간 통역,

토론 친구, 인물 인터뷰, 가정통신문, 학습 기록, 교사 관리. Main area: greeting header with

language selector, a grid of feature cards, and a "최근 활동" list. Clean, spacious,

education-SaaS style.

### W3. 교과서 번역 (/translate)

Desktop OCR translation page. Two-column workspace: left \= image upload/preview \+ extracted

editable Korean text; right \= translation result in selected language. Top toolbar with

language selector and "번역하기" button. Side-by-side comparison emphasized for classroom

projection.

### W4. 실시간 통역 (/interpret)

Desktop interpreter page for classroom use. Large central conversation log with left/right

speech bubbles (original \+ translation \+ play button). Bottom bar with two big mic buttons

("한국어 말하기" / "내 언어 말하기") and language selectors. High-contrast, readable from a

distance (projector-friendly).

### W5. 토론 친구 (/debate)

Desktop AI debate page. Left sidebar nav. Center: topic header \+ chat thread with the

Korean-student AI (Korean \+ translation). Right panel: debate tips and 3 suggested replies.

Input bar at bottom with language toggle. Encouraging classroom tone.

### W6. 인물 인터뷰 (/persona)

Desktop character-interview page. Left: character picker (list of textbook characters with

avatars). Center: chat with the character (first person, Korean \+ translation) and source

tags ("근거: ..."). Right: suggested questions. Storybook-meets-classroom aesthetic.

### W7. 가정통신문 번역 (/notice)

Desktop newsletter-translation page for teachers/parents. Left: upload the notice (image/PDF)

and pick target languages. Right: a "핵심 요약" card \+ full multilingual translations in

tabs per language, plus a "QR/링크 공유" button. Professional and trustworthy.

### W8. 학습 기록 (/records)

Desktop records page. A filterable table of translation and dialog records (columns: type,

preview, language pair, date) with a detail drawer that opens on row click. A "복습 도움"

panel summarizing weak expressions. Data-dashboard style but friendly.

### W9. 교사 관리 콘솔 (/admin)

한국어 설명: 교과서 등록(RAG) \+ 페르소나 등록을 한 화면에 통합.

Desktop teacher admin console with two tabs: "교과서 등록(RAG)" and "페르소나 등록".

Tab 1: form (subject, grade, unit title, passage textarea) \+ list of indexed units with

chunk counts. Tab 2: persona form (textbook unit, character name, system prompt with example)

\+ existing personas as cards. Clear teacher-tool layout with a left sidebar.

---

## 사용 팁

- Stitch에 먼저 **0번 디자인 시스템**을 입력해 톤을 고정한 뒤, 각 화면 프롬프트를 넣으면 일관성이 좋아진다.  
- 모바일 화면은 "Mobile", 웹 화면은 "Desktop web"이라는 단어를 유지해 플랫폼을 구분한다.  
- 생성 후 색상·마스코트가 흔들리면 "keep the teal \#14B8A6 and Dami robot mascot consistent"를 덧붙인다.

---

*v1.0 — 4단계 정교화 산출물. 함께 보기: CLAUDE.md / AGENTS.md / .cursorrules, 프로토타입 시각본.*  
