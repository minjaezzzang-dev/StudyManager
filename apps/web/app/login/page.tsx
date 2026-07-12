"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { checkAuthStatus } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    // 백엔드에서 DEBUG 모드 상태 확인
    checkAuthStatus().then((res) => {
      if (res.debug) setDebugMode(true);
    }).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple" | "facebook") => {
    if (debugMode) {
      setError("[DEBUG 모드] 소셜 로그인이 비활성화되어 있습니다. 이메일로 로그인해주세요.");
      return;
    }
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || `${provider} 로그인에 실패했습니다.`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-primary)" }}>
            <span className="text-3xl font-bold text-white" style={{ fontFamily: "Quicksand" }}>EK</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>EasyKR 로그인</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            다함께교실에 오신 것을 환영합니다
            {debugMode && <span className="ml-1 text-xs text-red-500">[DEBUG]</span>}
          </p>
        </div>

        {/* 소셜 로그인 — DEBUG 모드에서 비활성화 */}
        <div className="mb-6 space-y-3">
          {debugMode && (
            <div className="rounded-lg p-3 text-center text-sm" style={{ backgroundColor: "rgba(229, 115, 115, 0.1)", color: "var(--color-error)" }}>
              [DEBUG 모드] 소셜 로그인이 비활성화되었습니다.
            </div>
          )}
          <button
            onClick={() => handleSocialLogin("google")}
            disabled={debugMode}
            className="input-field flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>G</span> Google로 로그인
          </button>
          <button
            onClick={() => handleSocialLogin("apple")}
            disabled={debugMode}
            className="input-field flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>A</span> Apple로 로그인
          </button>
          <button
            onClick={() => handleSocialLogin("facebook")}
            disabled={debugMode}
            className="input-field flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>f</span> Facebook으로 로그인
          </button>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>또는</span>
          <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>이메일</label>
            <input type="email" className="input-field" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>비밀번호</label>
            <input type="password" className="input-field" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "rgba(229, 115, 115, 0.1)", color: "var(--color-error)" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
          계정이 없으신가요?{" "}
          <button onClick={() => router.push("/signup")} className="font-bold" style={{ color: "var(--color-primary)" }}>
            회원가입
          </button>
        </p>
      </div>
    </div>
  );
}
