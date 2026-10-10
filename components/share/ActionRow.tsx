"use client";

// 무료 구간 끝과 리포트 끝의 [SNS 공유하기](카카오 색) + [저장하기](펄골드) 한 줄(마스터스펙 6-1 화면 9, 높이 56px 이상).
// 저장하기(화면 6, 프로토타입 saveResult): "저장되었습니다!" → 로그인 안 했으면 로그인 화면(LOGIN_BIG/LOGIN_SMALL +
// 카카오·네이버·이메일 + [결과로 돌아가기]) → 로그인하면 같은 위치로 돌아와 "로그인되었어요. 결과가 내 계정에 저장됐어요."
// 결과 자체는 질문을 마친 순간 이미 저장돼 있다(로그인 = 계정, 아니면 이 기기의 비회원 저장) — 로그인하면 비회원 결과를 계정으로 옮긴다.
import { useEffect, useRef, useState } from "react";
import AuthStep from "@/components/auth/AuthStep";
import GuideArt from "@/components/test/GuideArt";
import { claimGuestResults } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";
import ShareSheet, { type ShareProps } from "./ShareSheet";
import { b14, useCopy } from "@/lib/copy/useCopy";

export interface SaveCopy {
  saveDone: string;
  loginBig: string;
  loginSmall: string;
  loginDone: string;
}

const KAKAO_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#191919" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.67 6.77l-.95 3.48c-.08.3.26.54.52.37l4.15-2.75c.53.07 1.07.11 1.61.11 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
  </svg>
);
const SAVE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1z" fill="none" stroke="#013566" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export default function ActionRow({
  share,
  copy,
  resultId,
  prefill,
  onRetrySave,
}: {
  /** 결과 저장이 실패했을 때 [저장하기]로 다시 저장해 보기(테스트 흐름에서만) */
  onRetrySave?: () => Promise<boolean>;
  share: ShareProps;
  copy: SaveCopy;
  /** 저장된 결과 id(저장이 실패했으면 null) */
  resultId: string | null;
  prefill?: { birthDate?: string; nickname?: string };
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [login, setLogin] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const back = useRef<{ y: number; el: HTMLElement | null }>({ y: 0, el: null });
  const copyB14 = useCopy();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function save(e: React.MouseEvent<HTMLButtonElement>) {
    if (!resultId) {
      // 저장이 실패한 결과: 한 번 더 저장해 본다(B14 ERR_SAVE '잠시 뒤 [저장하기]를 한 번 더')
      if (onRetrySave && (await onRetrySave())) return;
      setToast(b14(copyB14, "ERR_SAVE", "alt", "결과를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요."));
      return;
    }
    const btn = e.currentTarget;
    const session = await getRealSession();
    setModal(true);
    setTimeout(() => {
      setModal(false);
      if (!session) {
        back.current = { y: window.scrollY, el: btn };
        setLogin(true);
        window.scrollTo(0, 0);
      }
    }, 1200);
  }

  function backToResult(msg: string | null) {
    setLogin(false);
    setTimeout(() => {
      window.scrollTo(0, back.current.y);
      back.current.el?.focus({ preventScroll: true });
      if (msg) setToast(msg);
    }, 60);
  }

  async function afterSignIn() {
    const s = await getRealSession();
    if (s) await claimGuestResults(s).catch(() => {});
    backToResult(copy.loginDone);
  }

  return (
    <>
      {/* 프로토타입 actRow: .act-row 반반, 56px */}
      <div className="act-row">
        <button type="button" className="btn kakao act-btn" onClick={() => setShareOpen(true)}>
          {KAKAO_ICON}
          SNS 공유하기
        </button>
        <button type="button" className="btn act-btn save-btn" onClick={(e) => void save(e)}>
          {SAVE_ICON}
          저장하기
        </button>
      </div>
      <ShareSheet {...share} open={shareOpen} onClose={() => setShareOpen(false)} />

      {/* "저장되었습니다!"(프로토타입 .saved-modal — 금색 동그라미 체크, 뒤 배경 없음) */}
      <div className={`saved-modal${modal ? " on" : ""}`} role="status" aria-live="polite" hidden={!modal}>
        <span className="sm-ic" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24">
            <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#013566" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p>{copy.saveDone || "저장되었습니다!"}</p>
      </div>

      {login && (
        // 로그인 화면(프로토타입 #scr-login). 로그인하거나 [결과로 돌아가기]를 누르면 결과의 같은 위치로 돌아간다.
        <div role="dialog" aria-modal="true" aria-label="로그인" className="fixed inset-0 z-50 overflow-auto" style={{ background: "linear-gradient(180deg,var(--midnight) 0%,#08244d 45%,var(--navy) 100%)" }}>
          <div className="app">
            <section className="screen on" id="scr-login" aria-labelledby="login-big">
              <AuthStep
                title={copy.loginBig}
                subtitle={copy.loginSmall}
                prefill={prefill}
                art={<GuideArt id="06" />}
                oauthRedirect={typeof window !== "undefined" && resultId ? `${window.location.origin}/results/${resultId}` : undefined}
                onSignedIn={() => void afterSignIn()}
              />
              <div className="footer-ctrl" style={{ justifyContent: "center" }}>
                <button type="button" className="linkish" onClick={() => backToResult(null)}>
                  결과로 돌아가기
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      <div className={`toast${toast ? " on" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
