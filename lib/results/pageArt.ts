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

/** 찾아볼 파일 순서: public/art/<별자리>/<파일>.png → public/art/<파일>.png */
export function pageArtCandidates(page: number, signIndex?: number): string[] {
  const a = PAGE_ART[page];
  if (!a) return [];
  const sign = signIndex !== undefined ? SIGN_FILE_KEYS[signIndex] : undefined;
  return [...(sign ? [`/art/${sign}/${a[0]}.png`] : []), `/art/${a[0]}.png`];
}
