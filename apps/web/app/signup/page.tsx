"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { apiFetch } from "@/lib/api-client";

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
  
  // 1단계: 기본 정보 입력
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [nativeLanguage, setNativeLanguage] = useState("ko");
  
  // 2단계: 이메일 인증
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState(1); // 1: 정보입력, 2: 인증코드
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 1단계: 이메일 인증 코드 발송
  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 기본 검증
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      setLoading(false);
      return;
    }

    try {
      // 백엔드 API로 인증 코드 발송 요청
      const res = await apiFetch("/api/auth/send-verification", {
        method: "POST",
        body: JSON.stringify({ email, name, role, nativeLanguage, password }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "인증 코드 발송에 실패했습니다.");

      // 2단계로 이동
      setStep(2);
      setResendCooldown(60); // 60초 후 재발송 가능
      startResendTimer();
    } catch (err: any) {
      setError(err.message || "인증 코드 발송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 재발송 타이머
  const startResendTimer = () => {
    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 인증 코드 재발송
  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "재발송에 실패했습니다.");
      
      setResendCooldown(60);
      startResendTimer();
    } catch (err: any) {
      setError(err.message || "인증 코드 재발송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 인증 코드 검증 및 회원가입 완료
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!verificationCode || verificationCode.length !== 6) {
      setError("6자리 인증 코드를 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch("/api/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({ email, code: verificationCode }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "인증 코드가 올바르지 않습니다.");

      // Supabase 세션 설정 (자동 로그인)
      if (data.session?.access_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 1단계 UI
  if (step === 1) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8" style={{ backgroundColor: "var(--color-bg)" }}>
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-primary)" }}>
              <span className="text-3xl font-bold text-white" style={{ fontFamily: "Quicksand" }}>EK</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>EasyKR 회원가입</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>다문화 학생을 위한 학습 플랫폼</p>
          </div>

          <form onSubmit={handleSendVerification} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">이름</label>
              <input className="input-field" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">이메일</label>
              <input type="email" className="input-field" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>인증 코드가 이 이메일로 발송됩니다.</p>
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
              {loading ? "인증 코드 발송 중..." : "인증 코드 발송"}
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

  // 2단계 UI: 인증 코드 입력
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-primary)" }}>
            <span className="text-3xl font-bold text-white" style={{ fontFamily: "Quicksand" }}>EK</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>이메일 인증</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            <strong>{email}</strong>로 발송된 6자리 인증 코드를 입력해주세요.
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">인증 코드</label>
            <input
              type="text"
              className="input-field text-center text-2xl tracking-widest"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-center" style={{ color: "var(--color-text-secondary)" }}>
              숫자 6자리를 입력해주세요.
            </p>
          </div>

          {error && (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "rgba(229, 115, 115, 0.1)", color: "var(--color-error)" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "인증 중..." : "인증 완료 및 가입하기"}
          </button>

          {/* 재발송 버튼 */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendCooldown > 0 || loading}
              className="text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: "var(--color-primary)" }}
            >
              {resendCooldown > 0 
                ? `${resendCooldown}초 후 재발송 가능` 
                : '인증 코드 다시 받기'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
          <button onClick={() => setStep(1)} className="font-bold" style={{ color: "var(--color-primary)" }}>
            ← 정보 수정하기
          </button>
        </p>
      </div>
    </div>
  );
}
