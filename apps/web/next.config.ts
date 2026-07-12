import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker standalone 빌드용
  output: 'standalone',
  
  // 이미지 최적화 비활성화 (standalone에서 Sharp 불필요)
  images: {
    unoptimized: true,
  },
  
  // 환경 변수 프리픽스
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // 실험적 기능
  experimental: {
    // 서버 컴포넌트 최적화
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
};

export default nextConfig;
