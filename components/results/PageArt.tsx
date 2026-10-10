"use client";

// 결과 페이지 그림(패키지 v3 웹툰식 결과, 4:5 · 1080×1350): 제목 바로 아래.
// owner 2026-10-10: 그림은 태양 별자리별로 준비 — 게자리면 public/art/cancer/art_01_sky.png 를 먼저 찾고,
// 없으면 공통 public/art/art_01_sky.png, 둘 다 없으면 밤하늘 자리(주제 이름)만 보인다.
// 별자리 그림은 그림일 뿐 — 이름·진단 문구를 붙이지 않는다.
import { useEffect, useState } from "react";
import { PAGE_ART, pageArtCandidates } from "@/lib/results/pageArt";

export default function PageArt({ page, signIndex }: { page: number; signIndex?: number }) {
  const list = pageArtCandidates(page, signIndex);
  const key = list.join("|");
  // 불러온 그림을 어떤 후보 목록에서 찾았는지 함께 기억 — 페이지가 바뀌면 이전 그림을 쓰지 않는다
  const [loaded, setLoaded] = useState<{ key: string; src: string } | null>(null);
  const src = loaded?.key === key ? loaded.src : null;
  useEffect(() => {
    // 파일이 실제로 있는지 먼저 불러 본 뒤에만 그린다(깨진 그림 아이콘 방지, GuideArt와 같은 방식)
    let alive = true;
    const urls = key ? key.split("|") : [];
    const tryAt = (i: number) => {
      if (i >= urls.length) return;
      const im = new window.Image();
      im.onload = () => alive && setLoaded({ key, src: urls[i] });
      im.onerror = () => alive && tryAt(i + 1);
      im.src = urls[i];
    };
    tryAt(0);
    return () => {
      alive = false;
    };
  }, [key]);
  const label = PAGE_ART[page]?.[1] ?? "";
  return (
    <figure className="page-art">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- 미리 불러 확인한 정적 파일
        <img src={src} alt="" />
      ) : (
        <div className="ph" aria-hidden="true">
          <b>{label}</b>
        </div>
      )}
    </figure>
  );
}
