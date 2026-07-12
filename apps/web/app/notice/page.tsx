"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export default function NoticePage() {
  const router = useRouter();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotices() {
      // Supabase에서 직접 공지사항(번역 기록 중 type='notice') 조회
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("translations")
        .select("*")
        .eq("type", "notice")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotices(data);
      }
      setLoading(false);
    }
    loadNotices();
  }, [router]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <header className="flex items-center gap-4 px-6 py-4" style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={() => router.push("/dashboard")} className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
          ← 대시보드
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: "Quicksand" }}>공지사항</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {loading ? (
          <p style={{ color: "var(--color-text-secondary)" }}>로딩 중...</p>
        ) : notices.length === 0 ? (
          <div className="card text-center">
            <p className="text-4xl mb-4">📢</p>
            <p style={{ color: "var(--color-text-secondary)" }}>아직 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((n) => (
              <div key={n.id} className="card">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: "var(--color-accent)", color: "white" }}>
                    {n.target_lang}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {new Date(n.created_at).toLocaleString("ko-KR")}
                  </span>
                </div>
                <p className="text-sm">{n.result_text || n.source_text}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
