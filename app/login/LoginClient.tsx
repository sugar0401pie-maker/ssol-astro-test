"use client";

// 로그인 화면(/login, owner 결정 2026-10-10: 첫 화면의 [빠르게 로그인하고 테스트하기]가 오는 곳, 별도 페이지).
// 카카오로 로그인하기 / 네이버로 로그인하기 / 이메일로 계속하기 중에 고르고, 그 아래 작은 글씨 '로그인 없이 테스트하기'.
// ?next=/test(첫 화면) · /results(내 결과)로 돌아갈 곳을 받는다 — 사이트 안 경로만(safeNextPath). 없으면 내 결과.
// 이 기기에 로그인 없이 저장해 둔 결과는 로그인 뒤 계정으로 옮겨진다(useRealSession → claimGuestResults).
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AuthStep from "@/components/auth/AuthStep";
import { safeNextPath } from "@/lib/auth/nextPath";
import { getRealSession } from "@/lib/supabase/browser";
import { signInAnonymouslyIfNeeded } from "@/lib/supabase/authClient";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const goNext = useCallback(() => router.replace(next), [router, next]);
  const [starting, setStarting] = useState(false);

  // 이미 로그인돼 있으면(쏘웰라·디저트 테스트에서 로그인한 경우 포함) 바로 다음 화면으로.
  useEffect(() => {
    void getRealSession().then((s) => s && goNext());
  }, [goNext]);

  // 로그인 없이 테스트: 익명(임시) 계정을 만든 뒤 테스트로. 익명 로그인이 안 돼도 테스트는 진행한다.
  async function withoutLogin() {
    setStarting(true);
    await signInAnonymouslyIfNeeded().catch(() => {});
    router.push("/test");
  }

  return (
    <AuthStep
      title="쏠 웰니스 하우스 계정으로 로그인해 주세요."
      initialMode={params.get("mode") === "signup" ? "signup" : "signin"}
      oauthRedirect={typeof window !== "undefined" ? `${window.location.origin}${next}` : undefined}
      onSignedIn={goNext}
      belowButtons={
        <button type="button" className="linkish mx-auto text-sm" onClick={() => void withoutLogin()} disabled={starting}>
          {starting ? "테스트를 준비하는 중…" : "로그인 없이 테스트하기"}
        </button>
      }
    />
  );
}
