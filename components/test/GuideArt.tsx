"use client";

// 화면별 안내 그림(owner 2026-10-10 '화면별 프로세스(캐릭터 안내 그림용)'): 제목(헤더) → 안내말 → 그 아래 그림.
// 파일: public/guide/<화면>/<이름>.webp(목록은 lib/guide/art.ts). 불러오지 못하면 자리를 차지하지 않고 숨는다.
// 결과 화면 그림은 패키지 v3부터 페이지별 PageArt(public/art/<별자리>/art_0N_*.png)가 맡는다.
import { useEffect, useState } from "react";
import { pickGuideArt, type GuideArtId } from "@/lib/guide/art";

export const GUIDE_ART = {
  "02": "문 앞에서 손 흔들며 맞이하는 안내 캐릭터",
  "03": "고개를 갸웃하며 묻는 안내 캐릭터",
  "03-1": "별지도를 펼쳐 보여 주는 안내 캐릭터",
  "04": "달력과 시계를 들고 있는 안내 캐릭터",
  "05": "메모장에 받아 적는 안내 캐릭터",
  "06": "열쇠와 편지 봉투를 건네는 안내 캐릭터",
  "07": "두 갈래 길 앞에서 가리키는 안내 캐릭터",
  "08": "망원경으로 하늘을 보는 안내 캐릭터",
} as const satisfies Record<GuideArtId, string>;

export default function GuideArt({ id }: { id: GuideArtId }) {
  // 화면을 열 때마다 그 화면 그림 중 한 장을 무작위로(owner 2026-10-10). 고르는 건 브라우저에서만 —
  // 서버에서 미리 그린 화면과 달라져 깨지지 않게, 그리고 파일을 먼저 불러 확인한 뒤에만 그린다(깨진 그림 아이콘 방지).
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const url = pickGuideArt(id, Math.random());
    if (!url) return;
    const im = new window.Image();
    im.onload = () => alive && setSrc(url);
    im.src = url;
    return () => {
      alive = false;
    };
  }, [id]);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element -- 미리 불러 확인한 정적 파일
  return <img src={src} alt={GUIDE_ART[id]} className="guide-art" />;
}
