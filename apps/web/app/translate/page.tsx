"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { saveTranslation } from "@/lib/api-client";

const LANGUAGES = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
];

export default function TranslatePage() {
  const router = useRouter();
  const [sourceText, setSourceText] = useState("");
  const [targetLang, setTargetLang] = useState("ko");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    setError("");

    try {
      // TODO: 실제 번역은 Edge Function 또는 백엔드에서 처리
      // 현재는 백엔드에 번역 기록만 저장하는 예시
      const res = await saveTranslation({
        type: "notice",
        source_text: sourceText,
        target_lang: targetLang,
        result_text: `[${targetLang} 번역 결과] ${sourceText}`,
      });

      if (res.error) throw new Error(res.error);
      setResult(`[${targetLang} 번역 결과] ${sourceText}`);
    } catch (err: any) {
      setError(err.message || "번역 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* 헤더 */}
      <header className="flex items-center gap-4 px-6 py-4" style={{ backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={() => router.push("/dashboard")} className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
          ← 대시보드
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: "Quicksand" }}>번역</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="card space-y-4">
          <div>
            <label className="mb-2 block font-semibold">번역할 언어 선택</label>
            <select className="input-field" value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-semibold">원문 입력</label>
            <textarea
              className="input-field min-h-[120px] resize-none"
              placeholder="번역할 텍스트를 입력하세요..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
            />
          </div>

          <button onClick={handleTranslate} disabled={loading || !sourceText.trim()} className="btn-primary w-full">
            {loading ? "번역 중..." : "번역하기"}
          </button>

          {error && (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "rgba(229, 115, 115, 0.1)", color: "var(--color-error)" }}>
              {error}
            </div>
          )}

          {result && (
            <div>
              <label className="mb-2 block font-semibold">번역 결과</label>
              <div className="rounded-lg p-4" style={{ backgroundColor: "var(--color-bg)" }}>
                <p>{result}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
