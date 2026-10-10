"use client";

// 1. 인트로(마스터스펙 6-1 화면 1, 2026-10-09 프로토타입 #scr-intro 마크업·클래스 그대로):
// 그림 6장이 화면 전체를 채우고 2초마다 무작위로 바뀐다(같은 그림 연속 금지, '동작 줄이기'면 정지)
// + "SSOL WELLNESS HOUSE" + 제목 + [테스트 하기] + [카카오로 로그인하기]. 하단 정보는 그림 아래(.intro-foot)에 따로.
// 참여자 수는 실제 숫자가 아니면 표시하지 않는다(프로토타입의 숫자는 '예시'라고 적혀 있음 — 가짜 사회적 증거 금지).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SiteFooter from "@/components/SiteFooter";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import { getRealSession } from "@/lib/supabase/browser";
import { signInWithOAuth } from "@/lib/supabase/authClient";
import { INTRO_IMAGES, nextImage } from "./images";

const src = (i: number) => `/intro/${INTRO_IMAGES[i]}.jpg`;
const KAKAO_PATH = "M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.67 6.77l-.95 3.48c-.08.3.26.54.52.37l4.15-2.75c.53.07 1.07.11 1.61.11 5.52 0 10-3.58 10-8S17.52 3 12 3z";

export default function Intro() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 두 장을 겹쳐 두고 번갈아 보이게 한다(.intro-bg img.show, 0.7초). 첫 그림은 관측소(서버·브라우저가 같게), 2초 뒤부터 무작위.
  const [layers, setLayers] = useState<{ a: number; b: number | null; showA: boolean }>({ a: 4, b: null, showA: true });
  const current = useRef(layers.a);

  useEffect(() => {
    void getRealSession().then((s) => setLoggedIn(!!s));
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    INTRO_IMAGES.forEach((_, i) => {
      const im = new window.Image();
      im.src = src(i);
    });
    const timer = setInterval(() => {
      const n = nextImage(current.current);
      current.current = n;
      setLayers((l) => (l.showA ? { ...l, b: n, showA: false } : { ...l, a: n, showA: true }));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  async function kakao() {
    setError(null);
    const r = await signInWithOAuth("kakao", `${window.location.origin}/`);
    if (!r.ok) setError(r.error ?? "로그인하지 못했어요.");
  }

  return (
    <>
      <section className="screen on" id="scr-intro" aria-labelledby="intro-title">
        <div className="intro-bg" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- 2초마다 바뀌는 배경이라 미리 불러 둔 원본을 쓴다 */}
          <img src={src(layers.a)} alt="" className={layers.showA ? "show" : ""} />
          {layers.b !== null && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src(layers.b)} alt="" className={layers.showA ? "" : "show"} />
          )}
        </div>
        <p className="sr-only">밤하늘 아래 별자리 친구들이 모여 있는 일러스트</p>
        <div className="intro-overlay">
          <div className="logo-row">
            <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
              <path d="M1 9c3-5 6-5 9 0s6 5 11 0" fill="none" stroke="#CBB27A" strokeWidth="2" strokeLinecap="round" />
            </svg>
            SSOL WELLNESS HOUSE
          </div>
          <h1 id="intro-title">쏠 아스트로 하우스</h1>
          <div className="intro-btns mt-4">
            <Link href="/test" className="btn block">
              테스트 하기
            </Link>
            {loggedIn ? (
              <Link href="/results" className="btn block ghost">
                내 결과 보기
              </Link>
            ) : (
              <button type="button" className="btn block kakao" onClick={kakao}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#191919" d={KAKAO_PATH} />
                </svg>
                카카오로 로그인하기
              </button>
            )}
            {!loggedIn && (
              <Link href="/login" className="linkish text-center">
                다른 방법으로 로그인하기
              </Link>
            )}
            {error && <p className="err">{error}</p>}
          </div>
        </div>
      </section>
      <div className="intro-foot">
        <AuthFooterLink />
        <SiteFooter />
      </div>
    </>
  );
}
