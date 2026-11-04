// 유료 리포트(4~7장) 조립의 언어별 연결 말(영문판, 2026-11-04). 한국어(PKO)는 paidSkeleton.ts에 있던 문장 모양 그대로 옮긴 것이고
// (한국어 리포트는 바꾸기 전과 글자까지 같아야 한다 — 회귀 대조), 영어(PEN)의 고정 용어는 용어집(판정 이름 Open Year 등),
// 이어 붙이는 문장 모양은 Claude 초안이다(원어민 검수 대상). 해석 문장 자체는 DB에서 온다.
import { formatDate, formatRange, josa, QUARTER_LABELS } from "./format.ts";
import { EN, formatDateEn, ordinal, SIGN_EN } from "./lang.ts";
import { POINT_KO } from "./labels.ts";

export type Level = "순풍" | "보통" | "역풍";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export interface PL {
  en: boolean;
  point(k: string): string;
  sign(s: string): string;
  house(n: number): string;
  date(iso: string, withYear?: boolean): string;
  range(from: string, to: string | null): string;
  month(m: number): string;
  monthPart(d: string): string;
  aspect(a: string): string;
  /** 판정 이름("활짝 열리는 해(순풍)" / "Open Year") */
  level(l: Level): string;
  movement(m: string): string;
  edge(key: string, ko: string): string;
  wish(w: string): string;
  competency(c: string): string;
  /** 연도 표기(5년 요약 토큰): "2029년" / "2029" */
  year(y: number): string;
  // ---- 이벤트 이름 ----
  pair(a: string, b: string, aspect: string): string;
  saturnReturn: string;
  chironReturn: string;
  retro(planet: string): string;
  ingress(planet: string, sign: string): string;
  eclipse(solar: boolean): string;
  houseTransit(planet: string, house: number): string;
  // ---- 근거 구절({{근거}}: 한국어 '-는' 구절 / 영어 명사구) ----
  evHouse(planet: string, houseNick: string): string;
  evConj(planet: string, target: string): string;
  evHarm(planet: string, target: string): string;
  evTense(planet: string, target: string): string;
  evSelf(planet: string, conj: boolean): string | null;
  basisFallback: string;
  basisOpenFallback: string;
  basisHeadFallback: string;
}

export const PKO: PL = {
  en: false,
  point: (k) => POINT_KO[k as keyof typeof POINT_KO] ?? k,
  sign: (s) => s,
  house: (n) => `${n}하우스`,
  date: (iso, withYear = false) => formatDate(iso, withYear),
  range: (from, to) =>
    !to || from === to ? formatDate(from) : from.slice(0, 4) !== to.slice(0, 4) ? `${formatDate(from, true)}~${formatDate(to, true)}` : formatRange(from, to),
  month: (m) => `${m}월`,
  monthPart: (d) => {
    const day = Number(d.slice(8, 10));
    return day <= 10 ? "초" : day <= 20 ? "중순" : "말";
  },
  aspect: (a) => a,
  level: (l) => ({ 순풍: "활짝 열리는 해(순풍)", 보통: "내 손에 달린 해(보통)", 역풍: "기반을 다지는 해(역풍)" })[l],
  movement: (m) => m,
  edge: (_k, ko) => ko,
  wish: (w) => w,
  competency: (c) => c,
  year: (y) => `${y}년`,
  pair: (a, b, aspect) => `${a}-${b} ${aspect}`,
  saturnReturn: "토성 리턴",
  chironReturn: "키론 리턴",
  retro: (p) => `${p} 역행`,
  ingress: (p, s) => `${p} ${s} 진입`,
  eclipse: (solar) => (solar ? "일식" : "월식"),
  houseTransit: (p, h) => `${p} ${h}하우스 통과`,
  evHouse: (p, hn) => `${josa(p, "이/가")} ${josa(hn, "을/를")} 지나는`,
  evConj: (p, t) => `${josa(p, "이/가")} ${josa(t, "와/과")} 겹치는`,
  evHarm: (p, t) => `${josa(p, "이/가")} ${josa(t, "을/를")} 돕는`,
  evTense: (p, t) => `${josa(p, "이/가")} ${josa(t, "와/과")} 긴장하는`,
  evSelf: () => null,
  basisFallback: "하늘의 흐름이 고르게 이어지는",
  basisOpenFallback: "돕는 흐름이 모이는",
  basisHeadFallback: "무게가 실리는",
};

const EN_LEVEL: Record<Level, string> = { 순풍: "Open Year", 보통: "Steady Year", 역풍: "Building Year" };
const EN_EDGE: Record<string, string> = {
  EDGE_UP_CLEAR: "close to an Open Year",
  EDGE_UP_MIXED: "close to an Open Year",
  EDGE_MID_LOW: "on the edge of a Building Year",
  EDGE_LOW_HIGH: "on the edge of a Steady Year",
};
const EN_WISH: Record<string, string> = {
  안정: "Stability", 도약: "Leap", 회복: "Recovery", 사랑: "Love", "좋은 사람들": "My people", 여유: "Breathing room",
  "건강한 생활": "Healthy routines", "경제적 여유": "Financial ease", 인정: "Recognition", 나다움: "Being myself", 시작: "A new start",
};
const dEn = (iso: string, withYear = false) => formatDateEn(iso, withYear);

export const PEN: PL = {
  en: true,
  point: (k) => EN.point(k),
  sign: (s) => SIGN_EN[s] ?? s,
  house: (n) => `${ordinal(n)} house`,
  date: dEn,
  range: (from, to) => {
    if (!to || from === to) return dEn(from);
    if (from.slice(0, 4) !== to.slice(0, 4)) return `${dEn(from, true)}–${dEn(to, true)}`;
    if (from.slice(5, 7) === to.slice(5, 7)) return `${dEn(from)}–${Number(to.slice(8, 10))}`;
    return `${dEn(from)}–${dEn(to)}`;
  },
  month: (m) => MONTHS[m - 1],
  monthPart: (d) => {
    const day = Number(d.slice(8, 10));
    return day <= 10 ? "early" : day <= 20 ? "mid" : "late";
  },
  aspect: (a) => EN.aspect(a),
  level: (l) => EN_LEVEL[l],
  movement: (m) => (m === "움직이는 해" ? "Moving Year" : m === "잔잔한 해" ? "Calm Year" : ""),
  edge: (k) => EN_EDGE[k] ?? "",
  wish: (w) => EN_WISH[w] ?? w,
  competency: (c) => EN.competency(c),
  year: (y) => String(y),
  pair: (a, b, aspect) => `${a}–${b} ${aspect}`,
  saturnReturn: "Saturn return",
  chironReturn: "Chiron return",
  retro: (p) => `${p} retrograde`,
  ingress: (p, s) => `${p} enters ${s}`,
  eclipse: (solar) => (solar ? "Solar eclipse" : "Lunar eclipse"),
  houseTransit: (p, h) => `${p} through your ${ordinal(h)} house`,
  // 영문 DB는 "With {{근거}}, …"처럼 명사구를 받는다(개발메모 §7: 소문자 시작 명사구)
  evHouse: (p, hn) => `${p} moving through your ${hn.toLowerCase()} area`,
  evConj: (p, t) => `${p} meeting your ${t}`,
  evHarm: (p, t) => `${p} supporting your ${t}`,
  evTense: (p, t) => `${p} pressing on your ${t}`,
  evSelf: (p, conj) => (conj ? `${p} returning to where it was when you were born` : `${p} at a tense angle to its birth position`),
  basisFallback: "the sky's currents flowing evenly",
  basisOpenFallback: "supportive currents gathering",
  basisHeadFallback: "the extra weight in the sky",
};

/** 분기 이름 */
export const quarterLabels = (P: PL): readonly string[] => (P.en ? EN.quarter : QUARTER_LABELS);
