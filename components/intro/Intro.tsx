"use client";

// 1. 인트로(마스터스펙 6-1 화면 1 — '디저트 테스트와 동일'). 디저트 테스트 첫 화면(quiz-ssol app/page.tsx)과 같은 구성:
// 큰 그림 + [테스트 하기] + [이미 테스트를 하셨다면 / 로그인하기]. 그림은 밤하늘 테마에 맞춘 로고·별 그래픽(전용 일러스트를 받으면 교체).
// 디저트 테스트의 '벌써 N명이 참여했어요'는 쓰지 않는다 — 실제 숫자가 아니면 표시하지 않는다(가짜 사회적 증거 금지).
// 문구는 스펙의 한 줄 콘셉트(마스터스펙 1장)·디자인 콘셉트(디자인가이드 첫 줄)·개요를 그대로 또는 쉽게 옮긴 것.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getRealSession } from "@/lib/supabase/browser";

export default function Intro() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    void getRealSession().then((s) => setLoggedIn(!!s));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 pb-6 pt-14 text-center">
      <Image src="/logo-mark-light.png" alt="쏠 웰니스 하우스" width={88} height={23} priority className="h-auto w-[88px]" />

      <svg viewBox="0 0 240 240" className="mt-10 w-[220px]" aria-hidden="true">
        <circle cx="120" cy="120" r="108" fill="none" stroke="#CBB27A" strokeWidth="0.75" />
        <circle cx="120" cy="120" r="80" fill="none" stroke="#CBB27A" strokeWidth="0.75" opacity="0.6" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return (
            <line
              key={i}
              x1={120 + 80 * Math.cos(a)}
              y1={120 + 80 * Math.sin(a)}
              x2={120 + 108 * Math.cos(a)}
              y2={120 + 108 * Math.sin(a)}
              stroke="#CBB27A"
              strokeWidth="0.75"
              opacity="0.6"
            />
          );
        })}
        <path d="M120 64 L128 104 L168 112 L128 120 L120 160 L112 120 L72 112 L112 104 Z" fill="#FDF6E9" opacity="0.9" className="astro-ring" />
        <circle cx="62" cy="58" r="2" fill="#FDF6E9" opacity="0.7" />
        <circle cx="186" cy="74" r="1.5" fill="#CBB27A" />
        <circle cx="176" cy="178" r="2" fill="#FDF6E9" opacity="0.6" />
      </svg>

      <p className="mt-8 text-sm text-gold">쏠 하우스의 밤하늘 아래에서 나를 읽는다</p>
      <h1 className="mt-2 text-3xl font-bold text-cream">쏠 점성술 하우스</h1>
      <p className="mt-3 text-base text-cream/85">별이 주는 질문, 심리학이 주는 답.</p>
      <p className="mt-5 text-sm leading-relaxed text-cream/75">
        태어난 날짜·시간·장소로 나만의 출생차트를 그리고,
        <br />
        지금의 고민에 맞춰 연말·2027년·앞으로 5년의 마음 가이드를 드려요.
      </p>

      <div className="mt-10 flex w-full flex-col gap-3">
        <Link href="/test" className="w-full rounded-full bg-gold px-6 py-4 text-lg font-bold text-navy">
          테스트 하기
        </Link>
        {loggedIn ? (
          <Link href="/results" className="flex w-full flex-col items-center rounded-full border border-cream px-6 py-2 text-cream">
            <span className="text-[11px] opacity-75">이전에 본 결과가 있다면</span>
            <span className="font-bold">내 결과 보기</span>
          </Link>
        ) : (
          <Link href="/login" className="flex w-full flex-col items-center rounded-full border border-cream px-6 py-2 text-cream">
            <span className="text-[11px] opacity-75">이미 테스트를 하셨다면</span>
            <span className="font-bold">로그인하기</span>
          </Link>
        )}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-cream/60">
        점성술은 과학적으로 검증된 예측 도구가 아니며, 이 결과는 자기 성찰을 위한 웰니스 콘텐츠입니다.
        중요한 결정은 현실의 정보와 전문가의 도움을 함께 살펴주세요.
      </p>
    </main>
  );
}
