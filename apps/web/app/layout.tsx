import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyKR — 다함께교실",
  description: "다문화 학생을 위한 한국 생활 가이드 — 번역, 통역, 토론, AI 페르소나",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
