// 인트로 배경 그림(2026-10-09 패키지 13_프로토타입/img, 720×1280) — 순서는 프로토타입 IMGS와 같다.
export const INTRO_IMAGES = ["picnic", "onsen", "kite", "forest-night", "observatory", "boat-night"] as const;

/** 직전과 다른 그림 하나(무작위) */
export function nextImage(current: number, rand: () => number = Math.random): number {
  let n = current;
  while (n === current) n = Math.floor(rand() * INTRO_IMAGES.length);
  return n;
}
