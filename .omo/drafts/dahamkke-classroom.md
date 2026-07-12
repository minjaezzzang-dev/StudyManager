# Draft: dahamkke-classroom

## Metadata
- **slug**: dahamkke-classroom
- **intent**: clear
- **review_required**: false
- **status**: approved
- **pending action**: write .omo/plans/dahamkke-classroom.md (APPROVED by user)

## Owner-decisions (RESOLVED by user)
1. **LLM 모델**: GPT-5.6 Luna — 텍스트/번역/LLM/페르소나/RAG/디베이트용
2. **STT/TTS 제공자 (3개 모델 사용)**:
   - STT (음성→텍스트): GPT-Realtime-Whisper ($0.00028/초)
   - 실시간 통역 (음성→음성 번역): GPT-Realtime-Translate ($0.00057/초)
   - 실시간 음성 대화 (로봇/대화형): GPT-Realtime-2.1 mini ($10/$20 토큰 100만개)
   - TTS (텍스트→음성): tts-1
   - OCR: Google Cloud Vision (유지 — 문서 명시)
3. **Reachy Mini 로봇(M6)**: 이 계획에서 제외, 나중에 별도 진행

## Decisions adopted as defaults (reversible internals)
- Monorepo: pnpm workspaces + Turborepo
- State management: TanStack Query (server) + Zustand (client)
- Navigation: Expo Router (file-based, matches Next.js pattern)
- UI library: React Native Paper (mobile) + Tailwind CSS (web)
- Embedding model: text-embedding-3-small (1536 dims matches schema)
- Vector index: HNSW (Supabase recommended, better for small datasets)
- Database: local Supabase CLI for dev, cloud Supabase project for staging
- Supabase Storage: buckets for ocr-images and tts-audio
- Audio: expo-audio (replaces deprecated expo-av)
- QR code: react-native-qrcode-svg (mobile) + qrcode (web)
