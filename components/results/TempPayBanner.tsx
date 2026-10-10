"use client";

// 임시 계정으로 결제한 사람에게(프로토타입 unlock() .temp-banner, 마스터스펙 6-1-1 '그 페이지 맨 위'):
// B11 PAY_TEMP_BANNER + [회원가입하고 보관하기] → 로그인 화면(openLogin('paid'): LOGIN_BIG_PAID · LOGIN_SMALL_GUEST ·
// 카카오/네이버/이메일로 계속하기 · [결과로 돌아가기]) → 로그인하면 이 기기의 결과·주문을 계정으로 옮기고 같은 페이지로 + LOGIN_DONE.
import { useState } from "react";
import AuthStep from "@/components/auth/AuthStep";
import GuideArt from "@/components/test/GuideArt";
import { b11, useCopy } from "@/lib/copy/useCopy";
import { claimGuestResults } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";
import { setFlash } from "@/lib/ui/flash";

export default function TempPayBanner({ banner, loginBig, resultId, page }: { banner: string; loginBig: string; resultId: string; page: number }) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);

  async function afterSignIn() {
    const s = await getRealSession();
    if (s) await claimGuestResults(s);
    setFlash(b11(copy, "LOGIN_DONE", "로그인되었어요. 결과가 내 계정에 저장됐어요."));
    location.replace(`/results/${resultId}/${page}`);
  }

  return (
    <>
      <div className="temp-banner" id="temp-banner">
        <p>{banner}</p>
        <button type="button" className="btn block small-btn" onClick={() => setOpen(true)}>
          회원가입하고 보관하기
        </button>
      </div>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="로그인" className="fixed inset-0 z-50 overflow-auto" style={{ background: "linear-gradient(180deg,var(--midnight) 0%,#08244d 45%,var(--navy) 100%)" }}>
          <div className="app">
            <section className="screen on" id="scr-login" aria-labelledby="login-big">
              <AuthStep
                title={loginBig || undefined}
                subtitle={b11(copy, "LOGIN_SMALL_GUEST", "로그인하면 지금 결과가 내 계정으로 옮겨지고, 쏘웰라 3일 이용권도 함께 받을 수 있어요.")}
                art={<GuideArt id="06" />}
                oauthRedirect={typeof window !== "undefined" ? `${window.location.origin}/results/${resultId}/${page}` : undefined}
                onSignedIn={() => void afterSignIn()}
                onBack={() => setOpen(false)}
              />
            </section>
          </div>
        </div>
      )}
    </>
  );
}
