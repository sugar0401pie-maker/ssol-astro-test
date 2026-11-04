// 결과 장 넘기기 스와이프(owner 2026-11-04: 화면마다 스와이프로 넘기기, 한·영 공통). 순수 판단 함수 — 테스트 있음.
// 가로로 충분히(64px 이상) 빠르게(0.7초 안) 밀었고, 세로보다 확실히 가로 움직임이 클 때만(1.6배) 장을 넘긴다 —
// 위아래로 읽어 내리다 살짝 비스듬한 손가락에 장이 넘어가지 않게.
export type SwipeDir = "next" | "prev" | null;

export function swipeDirection(dx: number, dy: number, ms: number): SwipeDir {
  if (ms > 700) return null;
  if (Math.abs(dx) < 64) return null;
  if (Math.abs(dx) < Math.abs(dy) * 1.6) return null;
  return dx < 0 ? "next" : "prev";
}
