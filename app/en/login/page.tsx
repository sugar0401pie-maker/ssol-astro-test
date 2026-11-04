import type { Metadata } from "next";
import { Suspense } from "react";
import LoginEn from "@/components/en/LoginEn";
import SiteFooterEn from "@/components/SiteFooterEn";

// 영문 로그인·회원가입((나) 영문 전용). 검색엔진에 올리지 않는다.
export const metadata: Metadata = { title: "Log in — SSOL Astro House", robots: { index: false, follow: false } };

export default function LoginEnPage() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7" lang="en">
      <Suspense fallback={null}>
        <LoginEn />
      </Suspense>
      <SiteFooterEn />
    </main>
  );
}
