import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata: Metadata = { title: "쏠 아스트로 하우스 — 로그인" };

export default function LoginPage() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7">
      <Suspense fallback={null}>
        <LoginClient />
      </Suspense>
    </main>
  );
}
