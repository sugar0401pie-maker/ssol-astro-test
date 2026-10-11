// 별자리 공유 이미지(owner 2026-10-11): 내 태양 별자리 그림 하나(무작위) + 별자리 소개 한 줄. 순수 함수.
// 출생 날짜·시간·장소·닉네임은 넣지 않는다 — 별자리 이름과 해석 DB A1 소개 문장만.
import { PAGE_ART, SIGN_FILE_KEYS } from "../results/pageArt.ts";

export const SIGN_SHARE_W = 1080;
export const SIGN_SHARE_H = 1350; // 4:5(인스타그램 피드 세로 최대 비율)

/** 공유에 쓸 수 있는 그림: 결과 1~7장의 그 별자리 그림(결제 전 잠긴 4장 그림 제외) */
export function signArtChoices(signIndex: number): string[] {
  const sign = SIGN_FILE_KEYS[signIndex];
  if (!sign) return [];
  return Object.values(PAGE_ART).map(([file]) => `/art/${sign}/${file}.webp`);
}

export function pickSignArt(signIndex: number, rand: () => number = Math.random): string | null {
  const list = signArtChoices(signIndex);
  return list.length ? list[Math.min(list.length - 1, Math.floor(rand() * list.length))] : null;
}

/** 한 줄 18~20자 안팎으로 단어 단위 줄 나눔 */
export function wrapLine(text: string, max = 20): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (line && `${line} ${w}`.length > max) {
      out.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}

export interface SignShareText {
  text: string;
  y: number;
  size: number;
  weight: 400 | 700;
  color: string;
  alpha?: number;
}

/** 그림(위 1080×1080) 아래 글자: 별자리 이름 → 소개(최대 2줄) → 사이트 이름 */
export function signShareTexts(sunSign: string, intro: { oneLiner: string; keywords: string } | null): SignShareText[] {
  const lines = intro ? wrapLine(intro.oneLiner, 22).slice(0, 2) : [];
  const texts: SignShareText[] = [{ text: sunSign, y: 1150, size: 54, weight: 700, color: "#CBB27A" }];
  lines.forEach((t, i) => texts.push({ text: t, y: 1215 + i * 46, size: 36, weight: 400, color: "#FDF6E9" }));
  texts.push({ text: "쏠 아스트로 하우스 · astro.ssolwellnesshouse.com", y: 1326, size: 24, weight: 400, color: "#FDF6E9", alpha: 0.65 });
  return texts;
}

/** 공유할 때 함께 보내는 글(X·카카오톡 등). 사이트 주소는 따로 붙인다. */
export function signShareMessage(sunSign: string, intro: { oneLiner: string; keywords: string } | null): string {
  return intro ? `${sunSign} — ${intro.oneLiner} (${intro.keywords})\n출생차트로 나를 돌아보는 쏠 아스트로 하우스` : `${sunSign}\n출생차트로 나를 돌아보는 쏠 아스트로 하우스`;
}

/** 카카오톡 카드용 그림(같은 그림의 800px jpg — 카카오는 webp를 못 읽을 수 있어 jpg 사본을 둔다). 사이트 절대 주소. */
export function kakaoArtUrl(artPath: string, site = "https://astro.ssolwellnesshouse.com"): string {
  return site + artPath.replace(/\/([a-z_0-9]+)\.webp$/, "/kakao/$1.jpg");
}

/** 이어 주는 말로 끝나는 어절(~며·~고·~도록·~면·~서·~어 …) 뒤는 줄을 바꿔도 뜻이 끊기지 않는다 */
const GOOD_BREAK = /(며|고|도록|면|서|여|어|해|씩|과|와|,)$/;

/**
 * 두 줄로 나누기(카카오 카드 설명, owner 2026-10-11 "부딪히며 하고 나서 줄바꿈"): 이어 주는 말 뒤 중에서 두 줄이 가장 고른 곳,
 * 그런 곳이 없거나 한쪽이 너무 길면(전체의 70% 넘음) 어절 경계 중 가장 고른 곳. 예) "먼저 불을 붙이고 부딪히며\n길을 여는 별자리예요."
 */
export function balancedTwoLines(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return text;
  const total = words.join(" ").length;
  const widest = (i: number) => Math.max(words.slice(0, i).join(" ").length, words.slice(i).join(" ").length);
  const pick = (cands: number[]) => cands.reduce((b, i) => (widest(i) < widest(b) ? i : b), cands[0]);
  const all = words.slice(1).map((_, k) => k + 1);
  const good = all.filter((i) => GOOD_BREAK.test(words[i - 1]));
  let best = good.length ? pick(good) : pick(all);
  if (widest(best) > total * 0.7) best = pick(all);
  return `${words.slice(0, best).join(" ")}\n${words.slice(best).join(" ")}`;
}
