// 유형 4개 중 고르기(owner 결정 2026-10-11, 추천안 C). 순수 함수.
// 예전에는 역량 2개 × 같은 방식 1개 = 2개 중 고르기라 두 카드가 거의 같아 보였다("둘 다 숨기는 유형").
// 이제 역량 2개 × 방식 2개 = 4개:
//   두 번째 방식 = 태양 별자리 원소가 1등 원소와 다르면 태양 원소의 방식, 같으면 2등 원소의 방식(규칙 C).
//   태어난 시간을 몰라 후보끼리 이미 방식이 다르면(하루 사이 달이 별자리를 옮김) 그 두 방식을 쓴다.
// 고른 방식은 개인화 보조일 뿐 — 진단·안전 판단에 쓰지 않는다(SAFE-005/014/015).
import { ELEMENTS, SIGNS, STYLE_BY_ELEMENT, type Competency, type Element, type Style } from "./constants.ts";

/** 그 방식이 어디서 왔는지 — 2번 섹션 '왜 이 유형인가' 마지막 문장을 고를 때 쓴다 */
export type StyleSource = "dominant" | "sun" | "second" | "time";

export interface TypeOption {
  competency: Competency;
  style: Style;
  source: StyleSource;
  /** 시간 모름·시간대 후보 화면: 이 선택지를 계산할 대표 시각("HH:MM") */
  pick?: string;
}

export interface TypePick {
  competency: Competency;
  style: Style;
}

const ELEMENT_OF_STYLE = Object.fromEntries(Object.entries(STYLE_BY_ELEMENT).map(([e, s]) => [s, e])) as Record<Style, Element>;
export const elementOfStyle = (s: Style): Element => ELEMENT_OF_STYLE[s];
export const elementOfSign = (sign: string): Element => ELEMENTS[Math.max(0, SIGNS.indexOf(sign as (typeof SIGNS)[number])) % 4];

/** 두 번째 방식(규칙 C): 태양 원소 ≠ 1등이면 태양 원소, 같으면 1등을 뺀 가장 높은 원소(같은 점수면 불·흙·공기·물 순) */
export function alternateStyle(elements: Record<Element, number>, dominant: Element, sunSign: string): { style: Style; source: "sun" | "second" } {
  const sunEl = elementOfSign(sunSign);
  if (sunEl !== dominant) return { style: STYLE_BY_ELEMENT[sunEl], source: "sun" };
  let best: Element | null = null;
  for (const e of ELEMENTS) if (e !== dominant && (best === null || elements[e] > elements[best])) best = e;
  return { style: STYLE_BY_ELEMENT[best!], source: "second" };
}

/** 2×2 표 순서: (역량1·방식1) (역량2·방식1) (역량1·방식2) (역량2·방식2) */
function grid(comps: Competency[], styles: Array<{ style: Style; source: StyleSource }>, pickOf?: (c: Competency, s: Style) => string | undefined): TypeOption[] {
  const out: TypeOption[] = [];
  for (const s of styles) for (const c of comps) out.push({ competency: c, style: s.style, source: s.source, ...(pickOf ? { pick: pickOf(c, s.style) } : {}) });
  return out;
}

/** A등급 역량 동점(1·2위 3%p 안): 역량 1·2위 × (1등 원소 방식, 두 번째 방식) */
export function tieTypeOptions(args: { competency: Competency; runnerUp: Competency; style: Style; elements: Record<Element, number>; sunSign: string }): TypeOption[] {
  const alt = alternateStyle(args.elements, elementOfStyle(args.style), args.sunSign);
  return grid([args.competency, args.runnerUp], [{ style: args.style, source: "dominant" }, alt]);
}

export interface CandidateLike {
  competency: Competency;
  style: Style;
  pick: string;
  /** 그 시각의 2위 역량(후보 역량이 하나뿐일 때 두 번째 역량으로) */
  runnerUp: Competency;
  /** 그 시각의 원소 점수(두 번째 방식을 고를 때) */
  elements: Record<Element, number>;
  sunSign: string;
}

/**
 * 시간 모름·시간대(B·C) 후보 화면: 많이 나온 순 후보에서 역량 2개(없으면 1등 후보의 2위 역량)와
 * 방식 2개(후보끼리 다르면 그 둘, 같으면 규칙 C)를 뽑아 4개. 후보가 3개여도 4개를 넘지 않는다.
 */
export function candidateTypeOptions(cands: CandidateLike[]): TypeOption[] {
  if (cands.length < 2) return [];
  const top = cands[0];
  const comps: Competency[] = [];
  for (const c of cands) if (!comps.includes(c.competency) && comps.length < 2) comps.push(c.competency);
  if (comps.length < 2) comps.push(top.runnerUp);
  const styles: Array<{ style: Style; source: StyleSource }> = [];
  for (const c of cands) if (!styles.some((s) => s.style === c.style) && styles.length < 2) styles.push({ style: c.style, source: styles.length === 0 ? "dominant" : "time" });
  if (styles.length < 2) styles.push(alternateStyle(top.elements, elementOfStyle(top.style), top.sunSign));
  const pickOf = (c: Competency, s: Style) => (cands.find((x) => x.competency === c && x.style === s) ?? cands.find((x) => x.competency === c) ?? top).pick;
  return grid(comps, styles, pickOf);
}

export function findOption(options: TypeOption[] | undefined, pick: TypePick | undefined): TypeOption | undefined {
  return pick ? options?.find((o) => o.competency === pick.competency && o.style === pick.style) : undefined;
}
