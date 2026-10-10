"use client";

// 로그인 화면(/login, owner 결정 2026-10-10: 첫 화면의 [빠르게 로그인하고 테스트하기]가 오는 곳, 별도 페이지).
// 카카오로 로그인하기 / 네이버로 로그인하기 / 이메일로 계속하기 중에 고르고, 그 아래 작은 글씨 '로그인 없이 테스트하기'.
// ?next=/test(첫 화면) · /results(내 결과)로 돌아갈 곳을 받는다 — 사이트 안 경로만(safeNextPath). 없으면 내 결과.
// 이 기기에 로그인 없이 저장해 둔 결과는 로그인 뒤 계정으로 옮겨진다(useRealSession → claimGuestResults).
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AuthStep from "@/components/auth/AuthStep";
import GuideArt from "@/components/test/GuideArt";
import { safeNextPath } from "@/lib/auth/nextPath";
import { oauthErrorFromUrl } from "@/lib/auth/oauthError";
import { b11, useCopy } from "@/lib/copy/useCopy";
import { getRealSession } from "@/lib/supabase/browser";
import { signInAnonymouslyIfNeeded } from "@/lib/supabase/authClient";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const goNext = useCallback(() => router.replace(next), [router, next]);
  const [starting, setStarting] = useState(false);
  const copy = useCopy();
  // 카카오·네이버 로그인이 실패하면 Supabase가 ?error=…&error_description=…(또는 # 뒤)로 돌려보낸다.
  // 예전엔 이 이유가 화면에 안 나와 '그냥 로그인 화면으로 돌아온 것'처럼 보였다 → 이유를 보여 준다.
  // 쿼리는 useSearchParams로 읽는다(서버·브라우저 첫 화면이 같게). # 뒤 오류는 드물어 쿼리만 본다.
  const oauthError = oauthErrorFromUrl({ search: `?${params.toString()}`, hash: "" });

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

  // 패키지 v3(2026-10-10) 로그인 화면: 테스트를 시작하러 왔으면(next=/test…) 시작 문구 + '로그인 없이 테스트하기',
  // [내 결과 보기]에서 왔으면 '로그인하고 내 결과를 다시 볼까요?'(임시 계정 링크 없음). 문구는 해석 DB B11.
  const isStart = next.startsWith("/test");
  const isMyResult = next.startsWith("/results/latest");
  const isSowella = params.get("for") === "sowella";
  const title = isSowella
    ? b11(copy, "LOGIN_BIG_SOWELLA", "쏘웰라와 대화하려면 로그인해 주세요.")
    : isMyResult ? b11(copy, "LOGIN_BIG_MYRESULT", "로그인하고 내 결과를 다시 볼까요?") : isStart ? b11(copy, "LOGIN_BIG", "빠르게 로그인하고 내 별자리를 확인해볼까요?") : "쏠 웰니스 하우스 계정으로 로그인해 주세요.";
  const subtitle = isSowella
    ? b11(copy, "LOGIN_SMALL_GUEST", "로그인하면 지금 결과가 내 계정으로 옮겨지고, 쏘웰라 3일 이용권도 함께 받을 수 있어요.")
    : isStart || isMyResult ? b11(copy, "LOGIN_SMALL", "결과는 내 계정에 저장돼서 언제든 다시 볼 수 있어요. 나중에 태어난 시간을 추가할 수도 있어요.") : undefined;

  return (
    <AuthStep
      title={title}
      subtitle={subtitle}
      start={isStart || isMyResult}
      initialMode={params.get("mode") === "signup" ? "signup" : "signin"}
      // 로그인 화면으로 돌아오게 한다: 성공하면 위 useEffect가 next로 보내고, 실패하면 이유를 여기서 보여 줄 수 있다.
      oauthRedirect={typeof window !== "undefined" ? `${window.location.origin}/login?next=${encodeURIComponent(next)}` : undefined}
      initialError={oauthError}
      onSignedIn={goNext}
      art={<GuideArt id="06" />}
      belowButtons={
        isMyResult || isSowella ? null : (
          <div className="text-center">
            <button type="button" className="linkish text-sm" onClick={() => void withoutLogin()} disabled={starting}>
              {starting ? "테스트를 준비하는 중…" : b11(copy, "LOGIN_GUEST_LINK", "로그인 없이 테스트하기")}
            </button>
            <p className="guest-note">{b11(copy, "LOGIN_GUEST_NOTE", "로그인 없이 하면 결과는 이 기기에 30일 동안만 저장되고, 쏘웰라는 이용할 수 없어요.")}</p>
          </div>
        )
      }
    />
  );
}
