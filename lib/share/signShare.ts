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
