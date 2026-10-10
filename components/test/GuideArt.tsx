"use client";

// 화면별 안내 그림(owner 2026-10-10 '화면별 프로세스(캐릭터 안내 그림용)'): 제목(헤더) → 안내말 → 그 아래 그림.
// 생일을 받기 전(02~08)은 '안내 캐릭터'가, 결과(09-1~09-8)부터는 사용자의 태양 별자리 캐릭터가 맡는다.
// 파일: public/guide/<연번>.png, 결과 화면은 별자리별 public/guide/<연번>-<별자리 영문>.png(예: 09-1-aries.png)를 먼저 찾고
// 없으면 <연번>.png. 둘 다 없으면 자리를 차지하지 않고 숨는다. 별자리 캐릭터는 그림일 뿐 — 이름·진단 문구를 붙이지 않는다.
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
  "09-1": "출생차트 휠을 가리키는 별자리 캐릭터",
  "09-2": "거울에 비친 별자리 캐릭터",
  "09-3": "한 해를 돌아보는 일기장을 펼친 별자리 캐릭터",
  "09-4": "커튼 뒤를 살짝 보여 주는 별자리 캐릭터",
  "09-6": "새 길 앞에 선 별자리 캐릭터",
  "09-7": "별자리 선을 잇는 별자리 캐릭터",
  "09-8": "찻잔을 건네는 별자리 캐릭터",
} as const;
export type GuideArtId = keyof typeof GUIDE_ART;

/** 유료 섹션 그림(화면별 프로세스 9-4~9-8). 2026-10-10 owner: 9-4 유료 경계와 9-5 연말 섹션은 한 화면으로 통합 → 4번 섹션은 09-4 */
export const LOCKED_ART: Record<number, GuideArtId> = { 4: "09-4", 5: "09-6", 6: "09-7", 7: "09-8" };

/** 별자리 이름 → 파일 이름용 영문(휠·공유 이미지와 같은 순서) */
export const SIGN_FILE_KEYS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;

export default function GuideArt({ id, signIndex }: { id: GuideArtId; signIndex?: number }) {
  const sign = signIndex !== undefined ? SIGN_FILE_KEYS[signIndex] : undefined;
  const candidates = [...(sign ? [`/guide/${id}-${sign}.png`] : []), `/guide/${id}.png`];
  const [i, setI] = useState(0);
  if (i >= candidates.length) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 파일이 없을 때 다음 후보로 넘기거나 조용히 숨기려고 onError를 쓴다
    <img key={candidates[i]} src={candidates[i]} alt={GUIDE_ART[id]} className="guide-art" onError={() => setI((n) => n + 1)} />
  );
}
