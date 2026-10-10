"use client";

// 화면별 안내 그림(owner 2026-10-10 '화면별 프로세스(캐릭터 안내 그림용)'): 제목(헤더) → 안내말 → 그 아래 그림.
// 생일을 받기 전까지는 별자리를 모르니 '안내 캐릭터'가 맡는다(결과부터는 사용자의 태양 별자리 캐릭터 — 캐릭터 노출 결정 후).
// 파일은 public/guide/<연번>.png (owner 표의 # 번호: 02 환영 … 08 로딩). 파일이 아직 없으면 자리를 차지하지 않고 숨는다.
import { useState } from "react";

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

export default function GuideArt({ id }: { id: GuideArtId }) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 파일이 없을 때 조용히 숨기려고 onError를 쓴다
    <img src={`/guide/${id}.png`} alt={GUIDE_ART[id]} className="guide-art" loading="eager" onError={() => setMissing(true)} />
  );
}
