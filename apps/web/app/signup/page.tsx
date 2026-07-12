"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

const NATIONALITIES = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "uz", name: "O'zbek", flag: "🇺🇿" },
  { code: "kk", name: "Қазақша", flag: "🇰🇿" },
];

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [nativeLanguage, setNativeLanguage] = useState("ko");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Supabase Auth로 회원가입
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if ( signUpError) throw signUpError;

      // 2. profiles 테이블에 프로필 생성 (RLS: auth.uid() = id)
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          name,
          role,
          native_language: nativeLanguage,
        });
        if (profileError) {
          console.warn("프로필 생성 실패 (이메일 인증 후 재시도 가능):", profileError.message);
        }
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-primary)" }}>
            <span className="text-3xl font-bold text-white" style={{ fontFamily: "Quicksand" }}>EK</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>EasyKR 회원가입</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>다문화 학생을 위한 학습 플랫폼</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">이름</label>
            <input className="input-field" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">이메일</label>
            <input type="email" className="input-field" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">비밀번호</label>
            <input type="password" className="input-field" placeholder="비밀번호 (8자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">역할</label>
            <select className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">학생</option>
              <option value="teacher">교사</option>
              <option value="parent">학부모</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">모국어</label>
            <select className="input-field" value={nativeLanguage} onChange={(e) => setNativeLanguage(e.target.value)}>
              {NATIONALITIES.map((n) => (
                <option key={n.code} value={n.code}>{n.flag} {n.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "rgba(229, 115, 115, 0.1)", color: "var(--color-error)" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
          이미 계정이 있으신가요?{" "}
          <button onClick={() => router.push("/login")} className="font-bold" style={{ color: "var(--color-primary)" }}>
            로그인
          </button>
        </p>
      </div>
    </div>
  );
}
