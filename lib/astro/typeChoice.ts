// 유형 4개 중 고르기(owner 결정 2026-10-11, 두 번째 방식 규칙은 2026-10-12 C → D). 순수 함수.
// 역량 2개 × 방식 2개 = 4개:
//   두 번째 방식(규칙 D) = 1등 원소의 반대 그룹(꺼내는 쪽 불·흙 / 간직하는 쪽 공기·물) 두 원소 중 점수가 높은 원소의 방식.
//   동점이면 달 원소 → 태양 원소 → 정해진 짝, 반대 그룹이 둘 다 0점이면 정해진 짝(공기↔불, 물↔흙).
//   규칙 C(태양 원소 우선)는 두 방식이 같은 그룹으로 자주 나와 카드 4개가 모두 소극적으로 읽혔다(owner 모의 계산 36%).
//   태어난 시간을 몰라 후보끼리 이미 방식이 다르면(하루 사이 달이 별자리를 옮김) 그 두 방식을 쓴다(그대로).
// 고른 방식은 개인화 보조일 뿐 — 진단·안전 판단에 쓰지 않는다(SAFE-005/014/015).
import { ELEMENTS, SIGNS, STYLE_BY_ELEMENT, type Competency, type Element, type Style } from "./constants.ts";

/** 그 방식이 어디서 왔는지 — 2번 섹션 '왜 이 유형인가' 마지막 문장을 고를 때 쓴다 */
export type StyleSource = "dominant" | "sun" | "second" | "other" | "zero" | "time";

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

/** 반대 그룹(방식 뜻 기준: 마음을 말로 꺼내는지 — 고전 점성술의 양·음 구분이 아님) */
const OPPOSITE: Record<Element, [Element, Element]> = { 불: ["공기", "물"], 흙: ["공기", "물"], 공기: ["불", "흙"], 물: ["불", "흙"] };
/** 정해진 짝: 거리두기 ↔ 다가가기, 맞춰주기 ↔ 조율하기 */
const FIXED_PAIR: Record<Element, Element> = { 공기: "불", 불: "공기", 물: "흙", 흙: "물" };

/** 규칙 D의 두 번째 원소(owner 변경안 2026-10-12의 secondElement 그대로) */
export function secondElement(elements: Record<Element, number>, dominant: Element, moonEl: Element | null, sunEl: Element): { el: Element; zero: boolean } {
  const [a, b] = OPPOSITE[dominant];
  if (elements[a] === 0 && elements[b] === 0) return { el: FIXED_PAIR[dominant], zero: true };
  if (elements[a] !== elements[b]) return { el: elements[a] > elements[b] ? a : b, zero: false };
  for (const e of [moonEl, sunEl]) if (e === a || e === b) return { el: e, zero: false };
  return { el: FIXED_PAIR[dominant], zero: false };
}

/**
 * 두 번째 방식과 그 근거(A5c): 0점 짝 → ZERO, 태양 원소 → SUN, 차트 전체 2등 원소(1등 제외 최고점과 같은 점수) → SECOND, 그 밖 → OTHER.
 * 0점 원소는 태양 원소나 2등일 수 없어 ZERO를 먼저 봐도 문서 순서(SUN·SECOND·OTHER·ZERO)와 같다.
 * moonSign이 없으면(달 별자리를 모름) 동점은 태양 원소 → 정해진 짝으로 정한다.
 */
export function alternateStyle(elements: Record<Element, number>, dominant: Element, sunSign: string, moonSign?: string | null): { style: Style; source: "sun" | "second" | "other" | "zero" } {
  const sunEl = elementOfSign(sunSign);
  const { el, zero } = secondElement(elements, dominant, moonSign ? elementOfSign(moonSign) : null, sunEl);
  const runnerUpScore = Math.max(...ELEMENTS.filter((e) => e !== dominant).map((e) => elements[e]));
  const source = zero ? "zero" : el === sunEl ? "sun" : elements[el] === runnerUpScore ? "second" : "other";
  return { style: STYLE_BY_ELEMENT[el], source };
}

/**
 * 옛 규칙 C(2026-10-11~12): 태양 원소 ≠ 1등이면 태양 원소, 같으면 1등을 뺀 최고점(같은 점수면 불·흙·공기·물 순).
 * 새 화면에는 쓰지 않는다 — 그 사이에 저장된 결과가 고른 유형을 다시 볼 때 그대로 인정하기 위해서만 남긴다.
 */
export function alternateStyleC(elements: Record<Element, number>, dominant: Element, sunSign: string): { style: Style; source: "sun" | "second" } {
  const sunEl = elementOfSign(sunSign);
  if (sunEl !== dominant) return { style: STYLE_BY_ELEMENT[sunEl], source: "sun" };
  let best: Element | null = null;
  for (const e of ELEMENTS) if (e !== dominant && (best === null || elements[e] > elements[best])) best = e;
  return { style: STYLE_BY_ELEMENT[best!], source: "second" };
}

export type ChoiceRule = "D" | "C";
const altFor = (rule: ChoiceRule, elements: Record<Element, number>, dominant: Element, sunSign: string, moonSign?: string | null) =>
  rule === "C" ? alternateStyleC(elements, dominant, sunSign) : alternateStyle(elements, dominant, sunSign, moonSign);

/** 2×2 표 순서: (역량1·방식1) (역량2·방식1) (역량1·방식2) (역량2·방식2) */
function grid(comps: Competency[], styles: Array<{ style: Style; source: StyleSource }>, pickOf?: (c: Competency, s: Style) => string | undefined): TypeOption[] {
  const out: TypeOption[] = [];
  for (const s of styles) for (const c of comps) out.push({ competency: c, style: s.style, source: s.source, ...(pickOf ? { pick: pickOf(c, s.style) } : {}) });
  return out;
}

/** A등급 역량 동점(1·2위 3%p 안): 역량 1·2위 × (1등 원소 방식, 두 번째 방식) */
export function tieTypeOptions(args: { competency: Competency; runnerUp: Competency; style: Style; elements: Record<Element, number>; sunSign: string; moonSign?: string }, rule: ChoiceRule = "D"): TypeOption[] {
  const alt = altFor(rule, args.elements, elementOfStyle(args.style), args.sunSign, args.moonSign);
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
  /** 그 시각의 달 별자리(규칙 D 동점 정리용) */
  moonSign?: string;
}

/**
 * 시간 모름·시간대(B·C) 후보 화면: 많이 나온 순 후보에서 역량 2개(없으면 1등 후보의 2위 역량)와
 * 방식 2개(후보끼리 다르면 그 둘, 같으면 규칙 D)를 뽑아 4개. 후보가 3개여도 4개를 넘지 않는다.
 */
export function candidateTypeOptions(cands: CandidateLike[], rule: ChoiceRule = "D"): TypeOption[] {
  if (cands.length < 2) return [];
  const top = cands[0];
  const comps: Competency[] = [];
  for (const c of cands) if (!comps.includes(c.competency) && comps.length < 2) comps.push(c.competency);
  if (comps.length < 2) comps.push(top.runnerUp);
  const styles: Array<{ style: Style; source: StyleSource }> = [];
  for (const c of cands) if (!styles.some((s) => s.style === c.style) && styles.length < 2) styles.push({ style: c.style, source: styles.length === 0 ? "dominant" : "time" });
  if (styles.length < 2) styles.push(altFor(rule, top.elements, elementOfStyle(top.style), top.sunSign, top.moonSign));
  const pickOf = (c: Competency, s: Style) => (cands.find((x) => x.competency === c && x.style === s) ?? cands.find((x) => x.competency === c) ?? top).pick;
  return grid(comps, styles, pickOf);
}

export function findOption(options: TypeOption[] | undefined, pick: TypePick | undefined): TypeOption | undefined {
  return pick ? options?.find((o) => o.competency === pick.competency && o.style === pick.style) : undefined;
}
