"use client";

// 화면별 안내 그림(owner 2026-10-10 '화면별 프로세스(캐릭터 안내 그림용)'): 제목(헤더) → 안내말 → 그 아래 그림.
// 파일: public/guide/<연번>.png(02~08). 없으면 자리를 차지하지 않고 숨는다.
// 결과 화면 그림은 패키지 v3부터 페이지별 PageArt(public/art/<별자리>/art_0N_*.png)가 맡는다.
import { useEffect, useState } from "react";
import { SIGN_FILE_KEYS } from "@/lib/results/pageArt";

export const GUIDE_ART = {
  "02": "문 앞에서 손 흔들며 맞이하는 안내 캐릭터",
  "03": "고개를 갸웃하며 묻는 안내 캐릭터",
  "03-1": "별지도를 펼쳐 보여 주는 안내 캐릭터",
  "04": "달력과 시계를 들고 있는 안내 캐릭터",
  "05": "메모장에 받아 적는 안내 캐릭터",
  "06": "열쇠와 편지 봉투를 건네는 안내 캐릭터",
  "07": "두 갈래 길 앞에서 가리키는 안내 캐릭터",
  "08": "망원경으로 하늘을 보는 안내 캐릭터",
} as const;
export type GuideArtId = keyof typeof GUIDE_ART;

export default function GuideArt({ id, signIndex }: { id: GuideArtId; signIndex?: number }) {
  const sign = signIndex !== undefined ? SIGN_FILE_KEYS[signIndex] : undefined;
  const first = sign ? `/guide/${id}-${sign}.png` : null;
  const fallback = `/guide/${id}.png`;
  // 파일이 실제로 있는지 브라우저에서 먼저 불러 본 뒤에만 그린다. <img onError>로 숨기면 화면이 준비되기 전에
  // 오류가 나서 놓치는 경우가 있어(서버에서 그린 HTML) 깨진 그림 아이콘이 보였다 — 2026-10-10 수정.
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const tryLoad = (url: string, next: () => void) => {
      const im = new window.Image();
      im.onload = () => alive && setSrc(url);
      im.onerror = () => alive && next();
      im.src = url;
    };
    const loadFallback = () => tryLoad(fallback, () => {});
    if (first) tryLoad(first, loadFallback);
    else loadFallback();
    return () => {
      alive = false;
    };
  }, [first, fallback]);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element -- 미리 불러 확인한 정적 파일
  return <img src={src} alt={GUIDE_ART[id]} className="guide-art" />;
}
