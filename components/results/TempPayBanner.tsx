"use client";

// 임시 계정으로 결제한 사람에게(프로토타입 unlock() .temp-banner, 마스터스펙 6-1-1 '그 페이지 맨 위'):
// B11 PAY_TEMP_BANNER + [회원가입하고 보관하기] → 로그인 화면(openLogin('paid'): LOGIN_BIG_PAID · LOGIN_SMALL_GUEST ·
// 카카오/네이버/이메일로 계속하기 · [결과로 돌아가기]) → 로그인하면 이 기기의 결과·주문을 계정으로 옮기고 같은 페이지로 + LOGIN_DONE.
import { useEffect, useState } from "react";
import AuthStep from "@/components/auth/AuthStep";
import GuideArt from "@/components/test/GuideArt";
import BottomSheet from "@/components/ui/BottomSheet";
import { b11, useCopy } from "@/lib/copy/useCopy";
import { claimGuestResults } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";
import { setFlash } from "@/lib/ui/flash";

// 리포트를 쓰는 동안(owner 2026-10-17): 배너·쓰는 중 별 화면은 그대로 두고, 완성 메일을 이유로 로그인을 권하는 팝업을 따로 띄운다
// (메일은 계정 메일로만 보낼 수 있어서). 결과마다 이 기기에서 한 번만(닫으면 다시 안 뜸). 문구는 owner 지정.
// 로그인하면 결과가 계정으로 옮겨지고, 완성되는 순간 메일이 나간다(lib/results/report.ts).
export const WRITING_MAIL_NOTE = "지금 로그인하시면 계정에 리포트를 보관할 수 있어요.";
export const WRITING_MAIL_BUTTON = "로그인하고 완성 메일 받기";
const WRITING_MAIL_DONE = "로그인되었어요. 리포트가 완성되면 메일로 알려드릴게요.";
const popupKey = (resultId: string) => `astro_mail_popup_${resultId}`;

export default function TempPayBanner({ banner, loginBig, resultId, page, writing = false }: { banner: string; loginBig: string; resultId: string; page: number; writing?: boolean }) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);
  const [popup, setPopup] = useState(false);

  useEffect(() => {
    if (!writing) return;
    let seen = false;
    try {
      seen = localStorage.getItem(popupKey(resultId)) === "1";
    } catch {}
    if (seen) return;
    // 쓰는 중 별 화면이 먼저 보이도록 잠깐 뒤에
    const t = setTimeout(() => setPopup(true), 1200);
    return () => clearTimeout(t);
  }, [writing, resultId]);

  function closePopup() {
    setPopup(false);
    try {
      localStorage.setItem(popupKey(resultId), "1");
    } catch {}
  }

  async function afterSignIn() {
    const s = await getRealSession();
    if (s) await claimGuestResults(s);
    setFlash(writing ? WRITING_MAIL_DONE : b11(copy, "LOGIN_DONE", "로그인되었어요. 결과가 내 계정에 저장됐어요."));
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
      <BottomSheet open={popup} onClose={closePopup} labelledBy="mail-popup-title">
        <h3 id="mail-popup-title">{WRITING_MAIL_NOTE}</h3>
        <button
          type="button"
          className="btn block"
          onClick={() => {
            closePopup();
            setOpen(true);
          }}
        >
          {WRITING_MAIL_BUTTON}
        </button>
      </BottomSheet>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="로그인" className="fixed inset-0 z-50 overflow-auto" style={{ background: "linear-gradient(180deg,var(--midnight) 0%,#08244d 45%,var(--navy) 100%)" }}>
          <div className="app">
            <section className="screen on" id="scr-login" aria-labelledby="login-big">
              <AuthStep
                title={loginBig || undefined}
                subtitle={b11(copy, "LOGIN_SMALL_GUEST", "로그인하면 지금 결과가 내 계정으로 옮겨지고, 쏘웰라와도 대화할 수 있어요.")}
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
