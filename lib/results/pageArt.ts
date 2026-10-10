// 결과 페이지 그림 경로(패키지 v3, 순수 함수). owner 2026-10-10: 태양 별자리별 그림 — 게자리면 cancer 폴더.

/** 별자리 순서(양자리=0)대로 파일 이름용 영문 */
export const SIGN_FILE_KEYS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;

export const PAGE_ART: Record<number, [file: string, label: string]> = {
  1: ["art_01_sky", "태어난 순간의 하늘"],
  2: ["art_02_type", "별이 본 나의 유형"],
  3: ["art_03_2026", "2026년 회고"],
  4: ["art_04_eoy", "연말까지 조심하면 좋을 것"],
  5: ["art_05_2027", "2027년 마음가짐"],
  6: ["art_06_5y", "앞으로 5년"],
  7: ["art_07_question", "별이 주는 질문"],
};

/** 4장 결제 전(잠긴 화면) 그림 — owner 화면별 프로세스 9-4 '커튼 뒤를 살짝 보여 주는' (9-5 연말 그림은 결제 후 4장) */
export const LOCKED_PAGE4_ART = "art_04_locked";

/**
 * 찾아볼 파일 순서: public/art/<별자리>/<파일>.webp → public/art/<파일>.webp(공통, 지금은 없음).
 * 그림은 owner 구글 드라이브 결과 그림(폴더 09-1~09-8 × 12별자리, 2026-10-10): 09-1→1장 … 09-3→3장,
 * 09-4→4장 결제 전, 09-5→4장 결제 후, 09-6→5장, 09-7→6장, 09-8→7장. 한 사람에게는 처음부터 끝까지 같은 별자리 그림만.
 */
export function pageArtCandidates(page: number, signIndex?: number, locked = false): string[] {
  const a = PAGE_ART[page];
  if (!a) return [];
  const file = page === 4 && locked ? LOCKED_PAGE4_ART : a[0];
  const sign = signIndex !== undefined ? SIGN_FILE_KEYS[signIndex] : undefined;
  return [...(sign ? [`/art/${sign}/${file}.webp`] : []), `/art/${file}.webp`];
}
