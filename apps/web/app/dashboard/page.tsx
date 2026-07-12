"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { getProfile, getTranslations } from "@/lib/api-client";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [translations, setTranslations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      // 1. 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      try {
        // 2. 백엔드 API에서 프로필 및 번역 기록 조회
        const [profileRes, translationsRes] = await Promise.all([
          getProfile(),
          getTranslations(),
        ]);
        setProfile(profileRes.data);
        setTranslations(translationsRes.data || []);
      } catch (err) {
        console.error("데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--color-bg)" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-primary)" }}>
            <span className="text-lg font-bold text-white" style={{ fontFamily: "Quicksand" }}>EK</span>
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "Quicksand" }}>EasyKR 대시보드</h1>
        </div>
        <button onClick={handleLogout} className="btn-secondary text-sm">로그아웃</button>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* 환영 메시지 */}
        <div className="card mb-6">
          <h2 className="mb-2 text-xl font-bold">환영합니다, {profile?.name || user?.email}님! 👋</h2>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            역할: {profile?.role || "미설정"} · 모국어: {profile?.native_language || "미설정"}
          </p>
        </div>

        {/* 기능 카드 */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button onClick={() => router.push("/translate")} className="card text-left transition hover:shadow-lg">
            <div className="mb-2 text-3xl">🌐</div>
            <h3 className="font-bold">번역</h3>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>텍스트 및 가정통신문 번역</p>
          </button>

          <button onClick={() => router.push("/notice")} className="card text-left transition hover:shadow-lg">
            <div className="mb-2 text-3xl">📢</div>
            <h3 className="font-bold">공지사항</h3>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>다국어 공지사항 확인</p>
          </button>

          <div className="card text-left">
            <div className="mb-2 text-3xl">🎤</div>
            <h3 className="font-bold">통역</h3>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>음성 통역 (준비 중)</p>
          </div>

          <div className="card text-left">
            <div className="mb-2 text-3xl">💬</div>
            <h3 className="font-bold">토론</h3>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>AI와 토론 (준비 중)</p>
          </div>

          <div className="card text-left">
            <div className="mb-2 text-3xl">🧑‍🏫</div>
            <h3 className="font-bold">페르소나</h3>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>AI 인물과 대화 (준비 중)</p>
          </div>

          <div className="card text-left">
            <div className="mb-2 text-3xl">📊</div>
            <h3 className="font-bold">학습 기록</h3>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>나의 학습 통계</p>
          </div>
        </div>

        {/* 최근 번역 기록 */}
        <div className="card">
          <h3 className="mb-4 text-lg font-bold">최근 번역 기록</h3>
          {translations.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>아직 번역 기록이 없습니다. 번역을 시작해보세요!</p>
          ) : (
            <div className="space-y-3">
              {translations.map((t: any) => (
                <div key={t.id} className="rounded-lg p-3" style={{ backgroundColor: "var(--color-bg)" }}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: "var(--color-accent)", color: "white" }}>
                      {t.type === "ocr" ? "OCR" : "공지"}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {new Date(t.created_at).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  <p className="text-sm">{t.result_text || t.source_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
