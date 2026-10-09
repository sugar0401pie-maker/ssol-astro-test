"use client";

// 첫 화면의 '이미 테스트를 하셨다면 로그인하기'와 하단 '로그인'이 오는 곳(디저트 테스트 /login과 같은 역할).
// 카카오·네이버·이메일 로그인과 회원가입(같은 쏠 웰니스 하우스 계정). 로그인하면 내 결과로 간다 —
// 이 기기에 로그인 없이 저장해 둔 결과는 내 결과 화면에서 계정으로 옮겨진다(useRealSession → claimGuestResults).
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import AuthStep from "@/components/auth/AuthStep";
import { getRealSession } from "@/lib/supabase/browser";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const toResults = useCallback(() => router.replace("/results"), [router]);

  // 이미 로그인돼 있으면(쏘웰라·디저트 테스트에서 로그인한 경우 포함) 바로 내 결과로.
  useEffect(() => {
    void getRealSession().then((s) => s && toResults());
  }, [toResults]);

  return (
    <AuthStep
      title="쏠 웰니스 하우스 계정으로 로그인해 주세요."
      initialMode={params.get("mode") === "signup" ? "signup" : "signin"}
      oauthRedirect={typeof window !== "undefined" ? `${window.location.origin}/results` : undefined}
      onSignedIn={toResults}
    />
  );
}
