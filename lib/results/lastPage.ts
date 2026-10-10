// 결과의 '마지막으로 보던 페이지'(패키지 v3 웹툰식 결과, 1~7) — 이 기기에 결과별로 기억한다.
// 결제(토스)하고 돌아오거나 [내 결과 보기]로 들어와도 그 페이지로 바로 연다. 저장소를 못 쓰면 1페이지.
export const RESULT_PAGES = 7;

export function clampPage(n: unknown): number {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v >= 1 && v <= RESULT_PAGES ? v : 1;
}

const key = (id: string) => `astro_last_page:${id}`;

export function rememberPage(id: string, page: number): void {
  try {
    localStorage.setItem(key(id), String(clampPage(page)));
  } catch {
    /* 저장소를 못 쓰는 환경 */
  }
}

export function lastPage(id: string): number {
  try {
    return clampPage(localStorage.getItem(key(id)));
  } catch {
    return 1;
  }
}
