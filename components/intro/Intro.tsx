"use client";

// 1. 인트로(마스터스펙 6-1 화면 1, 2026-10-09 프로토타입 #scr-intro 그대로):
// 12궁 캐릭터 일러스트 6장이 화면 전체를 채우고 2초마다 무작위로 바뀐다(같은 그림 연속 금지, '동작 줄이기'면 정지)
// + 영문 로고 "SSOL WELLNESS HOUSE" + 제목 + [테스트 하기] + [카카오로 로그인하기](#FEE500).
// 하단 정보(사업자 정보 푸터)는 그림 위가 아니라 인트로 아래(스크롤)에 따로 — layout의 SiteFooter가 맡는다.
// 참여자 수는 실제 숫자가 아니면 표시하지 않는다(프로토타입의 숫자는 예시라고 적혀 있음 — 가짜 사회적 증거 금지).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getRealSession } from "@/lib/supabase/browser";
import { signInWithOAuth } from "@/lib/supabase/authClient";
import { INTRO_IMAGES, nextImage } from "./images";

const IMGS = INTRO_IMAGES;
const src = (i: number) => `/intro/${IMGS[i]}.jpg`;

export default function Intro() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 두 장을 겹쳐 두고 번갈아 보이게 한다(0.7초 서서히 바뀜)
  const [layers, setLayers] = useState<{ a: number; b: number | null; showA: boolean }>({ a: 4, b: null, showA: true }); // 첫 그림은 관측소(서버·브라우저가 같게), 2초 뒤부터 무작위
  const current = useRef(layers.a);

  useEffect(() => {
    void getRealSession().then((s) => setLoggedIn(!!s));
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    IMGS.forEach((_, i) => {
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
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#0d2547]">
      <div aria-hidden="true" className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- 2초마다 바뀌는 배경이라 최적화 이미지 대신 미리 불러 둔 원본을 쓴다 */}
        <img src={src(layers.a)} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${layers.showA ? "opacity-100" : "opacity-0"}`} />
        {layers.b !== null && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src(layers.b)} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${layers.showA ? "opacity-0" : "opacity-100"}`} />
        )}
      </div>
      <p className="sr-only">밤하늘 아래 별자리 친구들이 모여 있는 일러스트</p>
      <div className="absolute inset-x-0 bottom-0 max-h-full overflow-auto bg-gradient-to-b from-[rgba(11,30,63,0)] via-[rgba(11,30,63,0.82)] to-[rgba(8,22,48,0.97)] px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-24">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-2 text-[13px] tracking-[0.12em] text-gold">
            <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
              <path d="M1 9c3-5 6-5 9 0s6 5 11 0" fill="none" stroke="#CBB27A" strokeWidth="2" strokeLinecap="round" />
            </svg>
            SSOL WELLNESS HOUSE
          </div>
          <h1 className="mt-1.5 text-[2.1rem] font-bold leading-tight text-cream [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">쏠 아스트로 하우스</h1>
          <div className="mt-5 grid gap-2.5">
            <Link href="/test" className="block w-full rounded-full bg-gold px-6 py-3.5 text-center text-lg font-bold text-navy">
              테스트 하기
            </Link>
            {loggedIn ? (
              <Link href="/results" className="block w-full rounded-full border border-cream px-6 py-3.5 text-center font-bold text-cream">
                내 결과 보기
              </Link>
            ) : (
              <button type="button" onClick={kakao} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FEE500] px-6 py-3.5 font-bold text-[#191919]">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#191919" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.67 6.77l-.95 3.48c-.08.3.26.54.52.37l4.15-2.75c.53.07 1.07.11 1.61.11 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
                </svg>
                카카오로 로그인하기
              </button>
            )}
            {!loggedIn && (
              <Link href="/login" className="text-center text-sm text-cream/80 underline underline-offset-2">
                다른 방법으로 로그인하기
              </Link>
            )}
            {error && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
