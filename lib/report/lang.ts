// 결과 문장 조립의 언어별 말(영문판, 2026-11-04). 한국어(ko)는 지금까지 코드에 있던 말 그대로, 영어(en)는
// 번역 묶음의 용어집(docs/spec/20_영문번역/용어집_번역가이드.md)의 고정 용어 그대로다 — 별자리·행성·원소·각도·하우스 이름 등.
// 해석 문장(DB)은 여기 두지 않는다. 문장을 이어 붙이는 짧은 연결 말(예: "M월 D일 무렵은 …였어요")만 둔다 —
// 영어 연결 말은 Claude 초안이라 원어민 검수 대상이다(파일 아래쪽 EN 표시).
import type { PointKey } from "../astro/constants.ts";
import { batchim, formatDate, QUARTER_LABELS } from "./format.ts";
import { POINT_KO } from "./labels.ts";

export type ReportLang = "ko" | "en";

export const SIGN_EN: Record<string, string> = {
  양자리: "Aries", 황소자리: "Taurus", 쌍둥이자리: "Gemini", 게자리: "Cancer", 사자자리: "Leo", 처녀자리: "Virgo",
  천칭자리: "Libra", 전갈자리: "Scorpio", 사수자리: "Sagittarius", 염소자리: "Capricorn", 물병자리: "Aquarius", 물고기자리: "Pisces",
};
export const POINT_EN: Record<string, string> = {
  sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn",
  uranus: "Uranus", neptune: "Neptune", pluto: "Pluto", chiron: "Chiron", asc: "Ascendant", mc: "Midheaven",
};
/** 한국어 행성 이름 → 영어(A1 ruler 칸 등) */
export const PLANET_NAME_EN: Record<string, string> = {
  태양: "Sun", 달: "Moon", 수성: "Mercury", 금성: "Venus", 화성: "Mars", 목성: "Jupiter", 토성: "Saturn",
  천왕성: "Uranus", 해왕성: "Neptune", 명왕성: "Pluto", 키론: "Chiron",
};
export const ELEMENT_EN: Record<string, string> = { 불: "Fire", 흙: "Earth", 공기: "Air", 물: "Water" };
export const MODALITY_EN: Record<string, string> = { 활동: "Cardinal", 고정: "Fixed", 변통: "Mutable" };
/** 각도: 정식 용어 먼저(용어집 Aspects) */
export const ASPECT_EN: Record<string, string> = { 합: "conjunction", 육분: "sextile", 사각: "square", 삼분: "trine", 충: "opposition" };
export const GROUP_EN: Record<string, string> = { CONJ: "conjunction", HARM: "harmony", TENSE: "tension" };
export const COMPETENCY_EN: Record<string, string> = {
  기대기: "Leaning on others", 믿기: "Trusting", "선 지키기": "Holding boundaries", 말하기: "Speaking up", 회복하기: "Repairing",
};
export const STYLE_EN: Record<string, string> = { 다가가기: "Reaching out", 맞춰주기: "Accommodating", 거리두기: "Stepping back", 조율하기: "Balancing" };
/** 별자리 기간(서양 점성술 관례의 대략값 — 한국어 A1 dates와 같은 날짜, 실제 판정은 엔진) */
export const SIGN_DATES_EN: Record<string, string> = {
  양자리: "Mar 21–Apr 19", 황소자리: "Apr 20–May 20", 쌍둥이자리: "May 21–Jun 21", 게자리: "Jun 22–Jul 22", 사자자리: "Jul 23–Aug 22",
  처녀자리: "Aug 23–Sep 22", 천칭자리: "Sep 23–Oct 22", 전갈자리: "Oct 23–Nov 21", 사수자리: "Nov 22–Dec 21", 염소자리: "Dec 22–Jan 19",
  물병자리: "Jan 20–Feb 18", 물고기자리: "Feb 19–Mar 20",
};

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function ordinal(n: number): string {
  const v = n % 100;
  const suf = v >= 11 && v <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suf}`;
}

/** 'YYYY-MM-DD' → "April 1"(용어집: {{날짜}} = "April 1") */
export function formatDateEn(iso: string, withYear = false): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${MONTHS_EN[m - 1]} ${d}${withYear ? `, ${y}` : ""}`;
}

/** 결과 조립에서 언어마다 달라지는 말 */
export interface Lx {
  lang: ReportLang;
  point(k: PointKey | string): string;
  sign(s: string): string;
  element(e: string): string;
  competency(c: string): string;
  style(s: string): string;
  /** "3하우스" / "3rd house" */
  house(n: number): string;
  date(iso: string): string;
  aspect(a: string): string;
  /** "목성-토성 합" / "Jupiter–Saturn conjunction" */
  pair(a: string, b: string, aspectOrGroup: string): string;
  orb(o: number): string;
  retro: string;
  quarter: readonly string[];
  saturnReturn: string;
  /** "{행성} {별자리}(3하우스) 이동" */
  ingress(planet: string, sign: string, house?: number | null): string;
  /** 하우스 별명 + 번호: "배움·말의 자리(3하우스)" / "your learning & communication area (3rd house)" */
  houseArea(nickname: string, n: number): string;
  /** 개인 트랜짓 전환점: "M월 D일 무렵은 {head}였어요. {past}" */
  personalTurn(date: string, head: string, past: string): string;
  quarterNow: string;
  reportTitle(nick: string): string;
  typeSummary(sun: string, nick: string, typeLine: string): string;
  rulerLabel: string;
  insideLabel: string;
  dst(kind: "gap" | "ambiguous"): string;
}

export const KO: Lx = {
  lang: "ko",
  point: (k) => POINT_KO[k as PointKey] ?? String(k),
  sign: (s) => s,
  element: (e) => e,
  competency: (c) => c,
  style: (s) => s,
  house: (n) => `${n}하우스`,
  date: (iso) => formatDate(iso),
  aspect: (a) => a,
  pair: (a, b, x) => `${a}-${b} ${x}`,
  orb: (o) => `오차 ${o.toFixed(1)}°`,
  retro: "역행",
  quarter: QUARTER_LABELS,
  saturnReturn: "토성 리턴",
  ingress: (planet, sign, house) => `${planet} ${sign}${house ? `(${house}하우스)` : ""} 이동`,
  houseArea: (nick, n) => `${nick}(${n}하우스)`,
  personalTurn: (date, head, past) => `${formatDate(date)} 무렵은 ${head}${batchim(head)?.has ? "이었어요" : "였어요"}. ${past}`,
  quarterNow: "지금 지나고 있는 시기예요. 아래 ‘연말까지 조심하면 좋을 것’에서 이어집니다.",
  reportTitle: (nick) => `${nick}님의 별 리포트`,
  typeSummary: (sun, nick, t) => `${sun} · ${nick}님은 ${t}입니다.`,
  rulerLabel: "수호성",
  insideLabel: "이 칸에 있는 행성",
  dst: (kind) =>
    `${kind === "gap" ? "태어난 시각이 서머타임으로 시계를 건너뛴 시간에 있어, 건너뛴 만큼 뒤로 옮겨 계산했어요." : "태어난 시각이 서머타임이 끝나며 두 번 있었던 시간이라, 첫 번째(서머타임 쪽)로 계산했어요."} 1시간 안의 차이로 상승궁·하우스가 바뀔 수 있어요.`,
};

// EN — 고정 용어는 용어집 그대로, 연결 문장(personalTurn·quarterNow·typeSummary·dst)은 Claude 초안(원어민 검수 대상).
export const EN: Lx = {
  lang: "en",
  point: (k) => POINT_EN[k as string] ?? String(k),
  sign: (s) => SIGN_EN[s] ?? s,
  element: (e) => ELEMENT_EN[e] ?? e,
  competency: (c) => COMPETENCY_EN[c] ?? c,
  style: (s) => STYLE_EN[s] ?? s,
  house: (n) => `${ordinal(n)} house`,
  date: (iso) => formatDateEn(iso),
  aspect: (a) => ASPECT_EN[a] ?? a,
  pair: (a, b, x) => `${a}–${b} ${x}`,
  orb: (o) => `orb ${o.toFixed(1)}°`,
  retro: "retrograde",
  quarter: ["Q1 (Jan–Mar)", "Q2 (Apr–Jun)", "Q3 (Jul–Sep)", "Q4 (Oct–Dec)"],
  saturnReturn: "Saturn return",
  ingress: (planet, sign, house) => `${planet} moves into ${sign}${house ? ` (${ordinal(house)} house)` : ""}`,
  houseArea: (nick, n) => `your ${nick} area (${ordinal(n)} house)`,
  // 번역 묶음 B11 TP_PERSONAL 영문 틀 그대로("Around {{날짜}}: {{A8 meaning_line 앞부분}}. {{A8 table_past}}") — 앞부분은 행성 이름으로 시작할 수 있어 대문자 그대로
  personalTurn: (date, head, past) => `Around ${formatDateEn(date)}: ${head}. ${past}`,
  quarterNow: "You're in this stretch right now. It continues below in “What to watch for until the end of the year.”",
  reportTitle: (nick) => `${nick}'s star report`,
  typeSummary: (sun, nick, t) => `${sun} · ${nick}: ${t.charAt(0).toLowerCase()}${t.slice(1)}.`,
  rulerLabel: "Ruler",
  insideLabel: "Planets in this sign",
  dst: (kind) =>
    `${kind === "gap" ? "Your birth time falls in the hour the clocks skipped for daylight saving time, so we moved it forward by the skipped hour." : "Your birth time falls in the hour that happened twice when daylight saving time ended, so we used the first one (daylight saving time)."} A difference within one hour can change your Ascendant and houses.`,
};

export const lx = (lang: ReportLang | undefined): Lx => (lang === "en" ? EN : KO);
