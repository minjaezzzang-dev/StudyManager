"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로그인 되어 있으면 대시보드로, 아니면 로그인 페이지로
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--color-bg)" }}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-primary)" }}>
            <span className="text-4xl font-bold text-white" style={{ fontFamily: "Quicksand" }}>EK</span>
          </div>
          <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>로딩 중...</p>
        </div>
      </div>
    );
  }

  return null;
}
