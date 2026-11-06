// 유료 섹션(4~7) 뼈대 — 해석 DB 문장과 엔진 계산값만으로 조립한다(AI 0회).
// 쓰임: ① AI에게 주는 'DB 문장(하한선)'과 표·접힌 근거 ② AI가 실패하면 이 뼈대가 그대로 리포트가 된다(fail safe).
// 표·접힌 근거·질문·실천·굵은 요약·연말 '달마다 살펴볼 것'은 AI를 거치지 않는다(마스터스펙 7-1 ⑤ — 화면의 날짜와 본문의 날짜가 어긋날 수 없게).
// 조립 순서와 문장 모양은 2026-10-09 패키지의 프로토타입(13_프로토타입/index.html renderEOY·render2027·render5y·renderQuestion)과
// 마스터스펙 6-1-1을 그대로 따른다. 프로토타입이 코드에서 만드는 연결 구절(예: "목성이 ○○와 삼분을 이룹니다")도 같은 모양으로 옮겼다.
import type { Answers } from "../astro/answers.ts";
import type { CharacterResult } from "../astro/character.ts";
import { SIGNS, elementOf, signIndex, type PlanetKey } from "../astro/constants.ts";
import type { Longitudes, NatalChart } from "../astro/natal.ts";
import { clipIntervals, scoreInWindow, type PeriodKey, type PeriodResult, type TimelineEvent, type Window } from "../astro/timeline.ts";
import { dailyPositions, dailyRange } from "../astro/transits.ts";
import { EDGE_LABEL, WISH_LEVEL_DISPLAY, type MovementLabel, type WishFactor, type WishLevel, type WishResult, type WishYear } from "../astro/wish.ts";
import { ELEMENT_ID, POINT_ID, aspectGroup, findRow, pad2, row, tryFill, type AstroDb } from "./db.ts";
import { a6Line, a8Id } from "./freeResult.ts";
import { formatDate, josa } from "./format.ts";
import { POINT_KO } from "./labels.ts";
import { b9Id, edgeLines, movementLine } from "./movement.ts";
import { ingressLine, selfAspectPhrase } from "./ingress.ts";
import { lunations, postShadowEnd, preShadowStart } from "../astro/yearEnd.ts";
import { a13Variant, b11, fillSummary } from "./variants.ts";
import { PEN, PKO, quarterLabels, type PL } from "./paidLang.ts";

// 조립 중인 리포트의 언어(영문판 2026-11-04). buildPaidSkeleton이 시작할 때 정하고 끝나면 한국어로 되돌린다 —
// 이 파일의 조립 함수는 모두 동기라 다른 요청과 섞이지 않는다. 밖에서 따로 부르는 함수(evidencePhrase 등)는 한국어.
let P: PL = PKO;

/** 본문 조각. AI가 쓰면 p/head만 나오고, DB 뼈대는 아래 모양을 다 쓴다. */
export type Block =
  | { t: "p"; text: string }
  /** "• 연말에 조심할 세 가지" 같은 소제목(말머리 포함) */
  | { t: "head"; text: string }
  /** "• 10월" 같은 작은 소제목 */
  | { t: "sub"; text: string }
  /** 번호 목록(굵은 제목 + 본문 + 작은 글씨) */
  | { t: "items"; items: Array<{ title: string; text: string; note?: string }> }
  /** 2027 흐름 단계: 굵은 단계 이름 + 1~2문장 */
  | { t: "step"; label: string; text: string }
  /** 바람과 흐름 잇기(AI 4문장, 실패 시 B12) */
  | { t: "bridge"; text: string }
  /** 작은 회색 안내 */
  | { t: "note"; text: string };

export interface WhyItem {
  title: string;
  when: string;
  meaning: string;
}
export interface WhyGroup {
  label: string;
  items: WhyItem[];
}

export interface TableRow {
  label: string;
  cells: string[];
}

/** 5년 타임라인(디자인가이드 7장): 별 크기 = 이루어짐, 반짝임 고리 = 움직임, 펄골드 채움 = 처음 열리는 해 */
export interface TimelineStar {
  year: number;
  level: WishLevel;
  /** "활짝 열리는 해(순풍)"처럼 두 말 함께 */
  display: string;
  edgeBadge: string | null;
  movement: MovementLabel;
  firstOpen: boolean;
  theme: string;
}

export interface PaidSection {
  no: 4 | 5 | 6 | 7;
  title: string;
  /** 굵은 한 문장 요약(B11 SUM_*, 마스터스펙 6-1-1) — AI를 거치지 않는다 */
  summary: string | null;
  /** AI가 다시 쓸 수 있는 본문(AI가 실패하면 이 DB 뼈대 그대로) */
  body: Block[];
  /** 본문 뒤에 늘 서버가 붙이는 부분(연말 '달마다 살펴볼 것') */
  tail: Block[];
  table: { columns: string[]; rows: TableRow[] } | null;
  /** 6번: 5년 타임라인 별 */
  stars?: TimelineStar[];
  /** 6번: 모두에게 부는 하늘의 흐름(A11, 타임라인 배경 공통 문구) — AI를 거치지 않는다 */
  commonSky?: Array<{ period: string; event: string; line: string; meaning: string }>;
  /** 섹션 맨 끝 '▸ 왜 그럴까 — 하늘에서 일어나는 일' 접힌 근거 */
  why: WhyGroup[];
}

export interface PaidSkeleton {
  sections: PaidSection[];
  /** 7번 섹션: 질문·실천은 DB 그대로(AI는 이유 문장만) */
  questions: { headline: string; items: string[]; why: string | null };
  practices: Array<{ title: string; how: string; why: string; condition: string; minutes: string }>;
  closing: string;
  /** AI 입력 {db_sentences}(빠짐없이 리포트에 들어가야 하는 하한선) — 섹션별 */
  dbSentences: Record<4 | 5 | 6 | 7, string[]>;
  /** 바람과 흐름 잇기 토큰 값: {{흐름근거}}(2027), {{바라던해}}(5년) */
  bridgeBasis27: string;
  desiredYear: number | null;
  /** 4번 '연말에 조심할 세 가지' 소제목+목록 — AI는 쓰지 않고 서버가 DB 문장으로 한 번만 붙인다(요약+DB 문장 중복 방지) */
  careful4: Block[];
}

/** A10 본문 첫 문장 "○○의 별이 ○○의 자리에서 거꾸로 가는 (것처럼 보이는) 기간입니다/이에요." —
 *  세 항목이 모두 같은 틀이라 이어 읽으면 반복된다. 행성·자리는 항목 아래 작은 줄(note)에 이미 있으니 뺀다. */
export function stripRxLead(text: string): string {
  const m = text.match(/^[^.!?]*거꾸로 가는[^.!?]*기간(입니다|이에요)\.\s*/);
  const rest = m ? text.slice(m[0].length).trim() : text;
  return rest || text;
}

/** 본문 조각 → 글자(채팅 요약·미리보기용) */
export function blockText(b: Block): string {
  switch (b.t) {
    case "items":
      return b.items.map((i) => `${i.title}. ${i.text}`).join(" ");
    case "step":
      return `${b.label} ${b.text}`;
    default:
      return b.text;
  }
}

const t = (db: AstroDb, table: string, id: string, col: string) => row(db, table, id)?.[col] ?? "";
const KO_RX: Record<string, string> = { mercury: "MERCURY", venus: "VENUS", mars: "MARS" };
const SLOW = new Set(["jupiter", "saturn", "uranus", "neptune", "pluto"]);
const PERSONAL = new Set(["sun", "moon", "mercury", "venus", "mars", "asc", "mc"]);

const month = (d: string) => Number(d.slice(5, 7));
const monthPart = (d: string) => P.monthPart(d);
const quarterOf = (m: number) => Math.floor((m - 1) / 3) + 1;
/** 같은 해면 "11월 3일~24일", 해가 바뀌면 연도까지(프로토타입 range) */
const rangeText = (from: string, to: string | null) => P.range(from, to);
const firstSentences = (text: string, n: number) => (text.match(/[^.!?]+[.!?]+/g) ?? [text]).slice(0, n).map((x) => x.trim()).join(" ");

/** 행성·지점의 별명(A16, 예: 책임의 별) */
const nickOf = (db: AstroDb, k: string) => t(db, "A16", `TERM_${POINT_ID[k]}`, "nickname") || P.point(k);
const houseNick = (db: AstroDb, h: number) => t(db, "A16", `TERM_H${pad2(h)}`, "nickname") || P.house(h);
const pk = (k: string) => P.point(k);
const fd = (iso: string, withYear = false) => P.date(iso, withYear);

/**
 * 하우스 기준 별자리: 상승궁이 있으면 상승궁, 시간 모름(C등급)이면 태양 별자리를 1하우스로 둔다(프로토타입 R.hb).
 * 연말·2027·5년의 '자리' 문장(A9·A10)에만 쓰고, 바람 판정 엔진은 C등급에서 하우스를 쓰지 않는다(5-2, 그대로).
 */
function houseBase(L: Longitudes): number {
  return signIndex(L.asc ?? L.sun);
}
const houseOfSign = (base: number, sign: string) => ((((SIGNS as readonly string[]).indexOf(sign) - base) % 12) + 12) % 12 + 1;
const addDay = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const houseOfLon = (base: number, lon: number) => (((signIndex(lon) - base) % 12) + 12) % 12 + 1;

/** 기간 안 목성이 가장 오래 머문 하우스(같으면 번호가 작은 쪽 — 프로토타입 jupHouseIn) */
function jupiterHouseIn(base: number, from: string, to: string): number {
  const count = new Map<number, number>();
  for (const lon of dailyPositions("jupiter", dailyRange(from, to))) {
    const h = houseOfLon(base, lon);
    count.set(h, (count.get(h) ?? 0) + 1);
  }
  let best = 0;
  let bestN = -1;
  for (const [h, n] of [...count.entries()].sort((a, b) => a[0] - b[0])) if (n > bestN) [best, bestN] = [h, n];
  return best;
}

/** 이벤트 이름(접힌 근거·월별 문장) — 프로토타입 evName */
function evName(e: TimelineEvent): string {
  switch (e.kind) {
    case "transit":
      if (e.milestone === "saturn_return") return P.saturnReturn;
      return P.pair(pk(e.transit), pk(e.target), P.aspect(e.aspect));
    case "chiron_return":
      return P.chironReturn;
    case "retrograde":
      return P.retro(pk(e.planet));
    case "ingress":
      return P.ingress(pk(e.planet), P.sign(e.sign));
    case "eclipse":
      return P.eclipse(e.eclipse === "solar");
  }
}

/** 이벤트의 정확한 날짜(구간 안에서 먼저 오는 것) */
function exactIn(e: TimelineEvent, w?: Window): string | null {
  const ivs = w ? clipIntervals(e.intervals, w) : e.intervals;
  return ivs.find((x) => x.exact)?.exact ?? e.intervals.find((x) => x.exact)?.exact ?? null;
}

// ---- 바람 판정 근거 ----

const factorName = (f: WishFactor) => (f.kind === "house" ? P.houseTransit(pk(f.transit), f.house) : P.pair(pk(f.transit), pk(f.target), P.aspect(f.aspect)));
const factorDate = (f: WishFactor) => (f.kind === "house" ? rangeText(f.intervals[0].from, f.intervals[f.intervals.length - 1].to) : fd(f.exact));
const topPlus = (y: WishYear) => [...y.factors].filter((f) => f.value > 0).sort((a, b) => b.value - a.value)[0];
const topMinus = (y: WishYear) => [...y.factors].filter((f) => f.value < 0).sort((a, b) => a.value - b.value)[0];

/** A13 {{근거}} 구절("-는"으로 끝남) — 프로토타입 basis */
export function evidencePhrase(db: AstroDb, f: WishFactor | undefined): string | null {
  if (!f) return null;
  const p = pk(f.transit);
  if (f.kind === "house") return P.evHouse(p, houseNick(db, f.house));
  const target = pk(f.target);
  const g = aspectGroup(f.aspect);
  // 같은 행성끼리(리턴 등): "목성이 목성과 겹치는" 대신 A16b 문구(영문 A16b는 아직 번역이 없어 영문 구절)
  if (f.target === f.transit) {
    const self = selfAspectPhrase(db, f.transit, g === "CONJ", P.en ? "en" : "ko") || P.evSelf(p, g === "CONJ");
    if (self) return self;
  }
  if (g === "CONJ") return P.evConj(p, target);
  if (g === "HARM") return P.evHarm(p, target);
  return P.evTense(p, target);
}

/** A8 뜻 한 줄(근거 목록) — 프로토타입 evMeaning */
function factorMeaning(db: AstroDb, f: WishFactor): string {
  if (f.kind === "house") return t(db, "A9", `${f.transit === "jupiter" ? "JUP" : "SAT"}_H${pad2(f.house)}`, "table_line");
  const id = `TR_${POINT_ID[f.transit]}_${POINT_ID[f.target]}_${aspectGroup(f.aspect)}`;
  return row(db, "A8", id)?.meaning_line ?? "";
}

function eventMeaning(db: AstroDb, e: TimelineEvent): string {
  if (e.kind === "ingress") return ingressLine(db, e.planet, e.house, P.en ? "en" : "ko");
  if (e.kind === "chiron_return") return t(db, "A16", "TERM_RETURN", "meaning_line");
  const id = a8Id(e);
  return id ? row(db, "A8", id)?.meaning_line ?? "" : "";
}

/** A13 행 — 판정 칸이 두 말 함께 표기("활짝 열리는 해(순풍)")와 "열리는 해"다. */
function wishRow(db: AstroDb, wish: string, level: WishLevel | "열리는 해") {
  const label = level === "열리는 해" ? level : WISH_LEVEL_DISPLAY[level];
  return findRow(db, "A13", (r) => r.wish === wish && r.level === label);
}

/** 움직이는 해의 구체 문장: 가장 큰 움직임 사건 1~2개를 월·영역과 함께 + B9 기질 문장(마스터스펙 6-1-1, 프로토타입 movementDetail). */
function movementDetail(db: AstroDb, y: WishYear, base: number, mvLine: string | null): string {
  const seen = new Set<string>();
  const picked = [...y.moves]
    .sort((a, b) => b.value - a.value || (a.exact < b.exact ? -1 : 1))
    .filter((m) => {
      const key = `${m.kind}|${m.transit}|${m.target ?? ""}|${m.aspect ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 2)
    .sort((a, b) => (a.exact < b.exact ? -1 : 1));
  const out = picked.map((m) => {
    const mo = month(m.exact);
    if (m.kind === "outer" && m.target && m.aspect) {
      const a8 = row(db, "A8", `TR_${POINT_ID[m.transit]}_${POINT_ID[m.target]}_${aspectGroup(m.aspect)}`);
      if (P.en) return `In ${P.month(mo)}, ${nickOf(db, m.transit).replace(/^./, (c) => c.toLowerCase())} touches ${nickOf(db, m.target).replace(/^./, (c) => c.toLowerCase())} (${P.pair(pk(m.transit), pk(m.target), P.aspect(m.aspect))}).${a8 ? ` ${a8.table_future}` : ""}`;
      return `${mo}월에는 ${josa(nickOf(db, m.transit), "이/가")} ${josa(nickOf(db, m.target), "을/를")} 건드려요(${POINT_KO[m.transit as PlanetKey]}-${POINT_KO[m.target]} ${m.aspect}).${a8 ? ` ${a8.table_future}` : ""}`;
    }
    if (m.kind === "saturn_return" || m.kind === "chiron_return") {
      const tr = t(db, "A16", "TERM_RETURN", "meaning_line");
      if (P.en) return `${P.month(mo)} brings your ${m.kind === "chiron_return" ? "Chiron" : "Saturn"} return.${tr ? ` ${tr}` : ""}`;
      return `${mo}월에는 ${m.kind === "chiron_return" ? "키론" : "토성"} 리턴이 있어요.${tr ? ` ${tr}` : ""}`;
    }
    const h = m.house ?? (m.sign ? houseOfSign(base, m.sign) : 0);
    const s9 = h ? t(db, "A9", `SAT_H${pad2(h)}`, "table_line") : "";
    if (P.en) return `In ${P.month(mo)}, Saturn moves into ${P.sign(m.sign ?? "")} (${P.house(h)} · ${houseNick(db, h)}).${s9 ? ` ${s9}` : ""}`;
    return `${mo}월에는 토성이 ${m.sign}(${h}하우스 · ${houseNick(db, h)})로 옮겨 가요.${s9 ? ` ${s9}` : ""}`;
  });
  return [...out, mvLine ?? ""].filter(Boolean).join(" ");
}

// ---- 연말 역행 ----

interface Rx {
  planet: "mercury" | "venus" | "mars";
  start: string;
  end: string | null;
  sign: string;
  house: number;
  row: Record<string, string> | null;
}

/** 4장 연말 항목: 역행(A10) · 역행 뒤 정리(A10p) · 역행 앞 준비(A10s, 2026-11-02) */
type CarefulItem = Rx & { phase: "rx" | "post" | "pre"; from: string; to: string | null; prow: Record<string, string> };

/** 그 날짜 이후 처음 시작하는 역행(프로토타입 rx) */
function rxFrom(db: AstroDb, events: TimelineEvent[], planet: Rx["planet"], from: string, base: number): Rx | null {
  const e = events
    .filter((x): x is Extract<TimelineEvent, { kind: "retrograde" }> => x.kind === "retrograde" && x.planet === planet && x.intervals[0].from >= from)
    .sort((a, b) => (a.intervals[0].from < b.intervals[0].from ? -1 : 1))[0];
  if (!e) return null;
  const house = e.house ?? houseOfSign(base, e.sign);
  const end = e.intervals[0].to;
  return { planet, start: e.intervals[0].from, end: end === "2031-12-31" ? null : end, sign: e.sign, house, row: row(db, "A10", `RX_${KO_RX[planet]}_H${pad2(house)}`) };
}

/**
 * A11 하늘의 공통 흐름 중 5년 파트(2027~2031)에 걸치는 것 — 기간 글자의 연도로 고른다.
 * 기간 표기는 DB 그대로(2026-10-08 엔진 계산과 대조해 모두 맞음을 확인: 목성 사자·처녀, 토성 양·황소·쌍둥이, 천왕성 쌍둥이 진입, 2027 일·월식).
 */
export function commonSky(db: AstroDb): Array<{ period: string; event: string; line: string; meaning: string }> {
  return db.dbs.A11.rows
    .filter((r) => Math.max(...(r.period_label.match(/20\d{2}/g) ?? ["0"]).map(Number)) >= 2027)
    .map((r) => ({ period: r.period_label, event: r.event, line: r.common_line, meaning: r.meaning_line }));
}

// ---- 2027 흐름 단계 ----

export interface FlowStage {
  kind: "review" | "mars" | "uranus" | "jupiter" | "neptune";
  /** 정렬용 달(연말 다시 보기는 0) */
  m: number;
  quarters: number[];
  /** "2026년 연말 — 다시 보기", "1~4월 — 정하지 말고 준비" */
  label: string;
  /** 분기 표 칸(프로토타입 phase) */
  phase: string;
  text: string;
  /** 접힌 근거용 */
  start?: string;
  end?: string | null;
  sign?: string;
  house?: number;
  date?: string;
}

/** B11 PHASE_* 의 단계 이름(" — " 뒤) */
const phaseWhat = (db: AstroDb, id: string, fallback: string) => b11(db, id).split(" — ")[1] ?? fallback;

/**
 * 2027년 흐름 단계(마스터스펙 6-1-1, 프로토타입 flowSteps): 화성 역행 = 정하지 말고 준비, 천왕성(개인 지점, 긴장 각도 먼저) = 제안과 계기,
 * 목성 별자리 이동 = N월 초·중순·말부터 정하고 자리 잡기, 해왕성 = 정리. 달 순서로. 연말 '다시 보기'는 따로(reviewStage).
 */
export function flowStages(db: AstroDb, events: TimelineEvent[], base: number): FlowStage[] {
  const steps: FlowStage[] = [];
  const y27 = (d: string) => d.slice(0, 4) === "2027";
  const mars = events
    .filter((e): e is Extract<TimelineEvent, { kind: "retrograde" }> => e.kind === "retrograde" && e.planet === "mars" && y27(e.intervals[0].from))
    .sort((a, b) => (a.intervals[0].from < b.intervals[0].from ? -1 : 1))[0];
  if (mars) {
    const start = mars.intervals[0].from;
    const end = mars.intervals[0].to;
    const h = mars.house ?? houseOfSign(base, mars.sign);
    const mr = row(db, "A10", `RX_MARS_H${pad2(h)}`);
    const when = P.en ? `${P.month(month(start))}${end ? `–${P.month(month(end))}` : ""}` : `${month(start)}${end ? `~${month(end)}` : ""}월`;
    steps.push({
      kind: "mars", m: month(start), quarters: [quarterOf(month(start))], label: `${when} — ${phaseWhat(db, "PHASE_PREP", "정하지 말고 준비")}`, phase: P.en ? "Prepare, but don't decide yet" : "정하지 말고 준비하기",
      text: P.en ? `${mr ? firstSentences(mr.text, 2) : ""} (${rangeText(start, end)} Mars retrograde · ${P.house(h)})`.trim() : `${mr ? firstSentences(mr.text, 2) : ""} (${rangeText(start, end)} 화성 역행 · ${h}하우스)`.trim(), start, end, sign: mars.sign, house: h,
    });
  }
  const contacts = (planet: string) => {
    const collect = (hardOnly: boolean) =>
      events
        .filter((e): e is Extract<TimelineEvent, { kind: "transit" }> => e.kind === "transit" && e.transit === planet && PERSONAL.has(e.target) && (!hardOnly || aspectGroup(e.aspect) !== "HARM"))
        // 역행으로 다시 지나는 것은 같은 사건 — 2027년 안에 정확한 날짜가 있는 첫 통과 하나만(바람 판정과 같은 규칙, 스펙 샘플 '4·6월')
        .flatMap((e) => {
          const iv = e.intervals.find((x) => x.exact && y27(x.exact));
          return iv ? [{ e, exact: iv.exact! }] : [];
        })
        .sort((a, b) => (a.exact < b.exact ? -1 : 1));
    const hard = collect(true);
    return hard.length ? hard : collect(false);
  };
  const monthsOf = (list: Array<{ exact: string }>) => [...new Set(list.map((x) => month(x.exact)))].sort((a, b) => a - b).slice(0, 3);
  const evText = (list: Array<{ e: Extract<TimelineEvent, { kind: "transit" }>; exact: string }>, n: number) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of list) {
      const id = a8Id(x.e);
      const r = id ? row(db, "A8", id) : null;
      if (r && !seen.has(r.id) && out.length < n) {
        seen.add(r.id);
        out.push(P.en ? `${P.month(month(x.exact))}: ${evName(x.e)} — ${r.table_future}` : `${month(x.exact)}월 ${evName(x.e)} — ${r.table_future}`);
      }
    }
    return out.join(" ");
  };
  const uc = contacts("uranus");
  const um = monthsOf(uc);
  const monthsLabel = (ms: number[]) => (P.en ? ms.map((x) => P.month(x)).join(" · ") : `${ms.join("·")}월`);
  if (um.length) steps.push({ kind: "uranus", m: um[0], quarters: um.map(quarterOf), label: `${monthsLabel(um)} — ${phaseWhat(db, "PHASE_TRIGGER", "제안과 계기")}`, phase: P.en ? "When offers and openings arrive" : "제안과 계기가 오는 때", text: evText(uc, 2) });
  const ji = events
    .filter((e): e is Extract<TimelineEvent, { kind: "ingress" }> => e.kind === "ingress" && e.planet === "jupiter" && y27(e.intervals[0].from))
    .sort((a, b) => (a.intervals[0].from < b.intervals[0].from ? -1 : 1))[0];
  if (ji) {
    const date = ji.intervals[0].from;
    const h = houseOfSign(base, ji.sign);
    const j9 = row(db, "A9", `JUP_H${pad2(h)}`);
    const when = P.en ? `From ${monthPart(date)} ${P.month(month(date))}` : `${month(date)}월 ${monthPart(date)}부터`;
    steps.push({
      kind: "jupiter", m: month(date), quarters: [quarterOf(month(date))], label: `${when} — ${phaseWhat(db, "PHASE_SETTLE", "정하고 자리 잡기")}`, phase: P.en ? `${when}: decide and settle in` : `${when} 정하고 자리 잡기`,
      text: (P.en
        ? `On ${fd(date)}, Jupiter moves into ${P.sign(ji.sign)} (${P.house(h)} · ${houseNick(db, h)}). ${j9?.table_line ?? ""}`
        : `${formatDate(date)} 목성이 ${ji.sign}(${h}하우스 · ${houseNick(db, h)})로 들어와요. ${j9?.table_line ?? ""}`).trim(), date, sign: ji.sign, house: ji.house ?? undefined,
    });
  }
  const nc = contacts("neptune");
  const nm = monthsOf(nc);
  if (nm.length) steps.push({ kind: "neptune", m: nm[0], quarters: nm.map(quarterOf), label: `${monthsLabel(nm)} — ${phaseWhat(db, "PHASE_TIDY", "정리")}`, phase: P.en ? "Clear things up rather than start new ones" : "새로 벌이기보다 정리하기", text: evText(nc, 1) });
  return steps.sort((a, b) => a.m - b.m);
}

/**
 * {{흐름근거}}(06 프롬프트 v3.1, 프로토타입 flowBasis27): 2027년에 바람을 돕는 가장 큰 사건을 월과 함께 쓴 '-는' 구절.
 * 목성 진입 → 천왕성 계기 순(역행·해왕성은 쓰지 않음). 없으면 "하반기 하늘의 흐름이 한결 부드러워지는".
 */
export function flowBasis27(db: AstroDb, stages: FlowStage[], withTime: boolean, base: number): string {
  const j = stages.find((s) => s.kind === "jupiter");
  if (j && j.date && j.sign) {
    const where = withTime ? houseNick(db, houseOfSign(base, j.sign)) : j.sign;
    if (P.en) return `${monthPart(j.date)} ${P.month(month(j.date))}, when Jupiter moves into ${withTime ? `your ${where.toLowerCase()} area` : P.sign(j.sign)}`;
    return `${month(j.date)}월 ${monthPart(j.date)} 목성이 ${josa(where, "으로/로")} 들어오는`;
  }
  const u = stages.find((s) => s.kind === "uranus");
  if (u) return P.en ? `${u.label.split(" — ")[0]}, when Uranus brings a fresh opening` : `${u.label.split(" — ")[0]} 천왕성이 새로운 계기를 건네는`;
  return P.en ? "the second half of the year, as the sky's currents soften" : "하반기 하늘의 흐름이 한결 부드러워지는";
}

/** 5년 역풍 문단: 변형 문장의 '다가오는 해/이 해' + 조사를 연도로 바꾼다(프로토타입 yearize — DB 문장의 '다가오는 해'를 그 해로). */
export function yearize(text: string, year: number): string {
  // 영문 DB 문장은 "the coming year"를 쓴다(대문자로 시작하면 그대로 연도로)
  if (P.en) return text.replace(/\b[Tt]he coming year\b/g, String(year));
  const JS: Record<string, "은/는" | "이/가" | "을/를" | "와/과" | "으로/로"> = { 는: "은/는", 가: "이/가", 를: "을/를", 와: "와/과", 로: "으로/로" };
  return text.replace(/(다가오는 해|이 해)(는|가|를|와|로)?/g, (_m, _a, j?: string) => (j ? josa(`${year}년`, JS[j]) : `${year}년`));
}

/** 5년 표·타임라인 테마(겹치지 않게 A9 keyword → keyword_alt 첫째 → 둘째, 마스터스펙 6-1-1) */
export function yearThemes(db: AstroDb, years: number[], base: number): Record<number, { kw: string; house: number; row: Record<string, string> | null }> {
  const used = new Set<string>();
  const out: Record<number, { kw: string; house: number; row: Record<string, string> | null }> = {};
  for (const y of years) {
    const house = y === 2027 ? jupiterHouseIn(base, "2027-07-01", "2027-12-31") : jupiterHouseIn(base, `${y}-01-01`, `${y}-12-31`);
    const a9 = row(db, "A9", `JUP_H${pad2(house)}`);
    const opts = a9 ? [a9.keyword, ...String(a9.keyword_alt ?? "").split(" · ").filter(Boolean)] : [];
    const kw = opts.find((k) => !used.has(k)) ?? opts[0] ?? "";
    used.add(kw);
    out[y] = { kw, house, row: a9 };
  }
  return out;
}

/** 움직임 사건 이름(접힌 근거) */
function moveName(m: WishYear["moves"][number]): string {
  if (m.kind === "outer") return P.pair(pk(m.transit), pk(m.target!), P.aspect(m.aspect!));
  if (m.kind === "chiron_return") return P.chironReturn;
  if (m.kind === "saturn_return") return P.saturnReturn;
  return P.en ? `Saturn enters ${P.sign(m.sign ?? "")}` : `토성 ${m.sign} 진입`;
}

export function buildPaidSkeleton(args: {
  db: AstroDb;
  chart: NatalChart;
  longitudes: Longitudes;
  character: CharacterResult;
  answers: Answers;
  events: TimelineEvent[];
  periods: Record<PeriodKey, PeriodResult>;
  wish: WishResult;
  nickname: string;
  /** 표현 변형 해시 열쇠(variants.ts birthKeyOf). 없으면 원래 문장(A13 1번) */
  birthKey?: string;
  /** 영문판(2026-11-04): en이면 db는 영문 DB, 연결 말은 영어 */
  lang?: "ko" | "en";
}): PaidSkeleton {
  P = args.lang === "en" ? PEN : PKO;
  try {
    return buildPaidSkeletonIn(args);
  } finally {
    P = PKO;
  }
}

function buildPaidSkeletonIn(args: Parameters<typeof buildPaidSkeleton>[0]): PaidSkeleton {
  const { db, longitudes: L, character, answers, events, periods, wish, nickname } = args;
  const key = args.birthKey ?? "";
  const nick = nickname;
  const wishWord = answers.q3;
  const base = houseBase(L);
  const withTime = L.asc !== undefined;
  const b8 = findRow(db, "B8", (r) => r.domain === answers.q1);
  const b7 = findRow(db, "B7", (r) => r.character === character.name);
  const quiet = t(db, "A15", "FIX_QUIET_DOMAIN", "text");
  // 시간 모름(C등급) 안내 — 프로토타입 renderEOY·render2027의 문장 그대로(5년 파트에는 없음)
  const isC = args.chart.accuracy === "C";
  // 영문은 번역 묶음 UI|0644·UI|0643 그대로
  const gradeC4 = isC ? (P.en ? "Without your birth time, this part reads the ‘areas’ with your Sun sign as the 1st house." : "태어난 시간을 몰라, 이 파트의 ‘자리’는 태양 별자리를 1하우스로 두고 살폈어요.") : "";
  const gradeC = isC ? (P.en ? "Without your birth time, we skipped the houses and Ascendant and based this reading on the planet tied to your wish and the flow of the Moon." : "태어난 시간을 몰라 하우스·상승궁 없이, 바람의 주제 행성과 달의 흐름으로만 판정했어요.") : "";
  const variant = (r: Record<string, string> | null, slot: "text" | "fallback_text" = "text", salt = "") => (r ? a13Variant(db, r, key, slot, salt) : "");
  // 같은 B9 행이 리포트 안에서 다시 나오면 변형 문장으로(5장 → 6장 순서로 부른다)
  const b9Seen = new Map<string, number>();
  const mvLine = (y: WishYear) => {
    const id = b9Id(y.movementLabel, wish.temperament, answers.q3);
    if (!id) return null;
    const n = b9Seen.get(id) ?? 0;
    b9Seen.set(id, n + 1);
    return movementLine(db, y, wish.temperament, answers.q3, n);
  };

  // ================= 4. 연말까지 =================
  const eoy = periods.eoy;
  const w4 = eoy.window;
  const today = w4.start;
  const eoyWord = findRow(db, "B11", (r) => r.place === `연말 조심할 것 — ${answers.q1}`)?.text ?? "";
  const sum4 = fillSummary(b11(db, "SUM_EOY"), { 닉네임: nick, 조심할것: eoyWord });
  const body4: Block[] = [];
  if (b8) body4.push({ t: "p", text: b8.focus_intro });
  if (gradeC4) body4.push({ t: "note", text: gradeC4 });
  // 연말에 조심할 세 가지: 금성·수성·화성 역행(프로토타입 rx 시작 기준일 그대로)
  const three = [rxFrom(db, events, "venus", "2026-09-01", base), rxFrom(db, events, "mercury", "2026-10-01", base), rxFrom(db, events, "mars", "2026-12-01", base)].filter(
    (x): x is Rx & { row: Record<string, string> } => !!x?.row,
  );
  // 2026-11-02 연말 보강(해석 DB A10p·A10s, 기획 검수본 v0.3): 역행이 끝났으면 '역행 뒤 정리'(제자리로 돌아오기까지),
  // 화성 역행이 아직 시작 전이고 준비 시기(순행으로 돌아설 자리에 처음 닿은 뒤)면 '역행 앞 준비', 정리 시기도 끝났으면 뺀다.
  const careful: CarefulItem[] = three.flatMap((x): CarefulItem[] => {
    // 영문 DB에 번역이 없는 표(A10p·A10s)는 빈 칸이다 — 그 항목은 빼고 보여 준다
    const ok = (r: Record<string, string> | null) => (r?.careful_cell ? r : null);
    const PP = x.planet.toUpperCase();
    if (x.end && x.end < today) {
      const until = postShadowEnd(x.planet, x.start, x.end);
      const from = addDay(x.end, 1);
      const r = ok(until && today <= until ? row(db, "A10p", `RXPOST_${PP}_H${pad2(x.house)}`) : null);
      return r ? [{ ...x, phase: "post", from, to: until!, prow: r }] : [];
    }
    if (x.start > today && x.end) {
      const pre = preShadowStart(x.planet, x.start, x.end);
      const r = ok(pre && today >= pre ? row(db, "A10s", `RXPRE_${PP}_H${pad2(x.house)}`) : null);
      if (r) return [{ ...x, phase: "pre", from: pre!, to: addDay(x.start, -1), prow: r }];
    }
    return [{ ...x, phase: "rx", from: x.start, to: x.end, prow: x.row }];
  });
  const allRx = careful.length === 3 && careful.every((c) => c.phase === "rx");
  const PHASE_KO = P.en ? ({ rx: "retrograde", post: "post-retrograde clear-up", pre: "pre-retrograde prep" } as const) : ({ rx: "역행", post: "역행 뒤 정리", pre: "역행 앞 준비" } as const);
  // 소제목은 늘 둔다(프로토타입 renderEOY). 셋이 모두 역행일 때만 '세 가지', 아니면 '연말에 살펴볼 것'(기획 v0.3 메모 — 숫자 없이)
  body4.push({ t: "head", text: P.en ? (allRx ? "• Three things to watch before year-end" : "• What to look at before year-end") : allRx ? "• 연말에 조심할 세 가지" : "• 연말에 살펴볼 것" });
  if (careful.length) {
    body4.push({
      t: "items",
      items: careful.map((x) => ({
        title: x.prow.careful_cell,
        text: `${x.phase === "rx" ? stripRxLead(x.prow.text) : x.prow.text} ${x.prow.action}`,
        note: P.en
          ? `${pk(x.planet)} ${PHASE_KO[x.phase]} · ${rangeText(x.from, x.to)} · ${P.sign(x.sign)} · ${P.house(x.house)} (${houseNick(db, x.house)})`
          : `${POINT_KO[x.planet]} ${PHASE_KO[x.phase]} · ${rangeText(x.from, x.to)} · ${x.sign} · ${x.house}하우스(${houseNick(db, x.house)})`,
      })),
    });
  }
  // 연말에 기대해도 좋은 일: 오늘~1월 말 목성의 합·조화 트랜짓 중 점수가 가장 큰 것(없으면 조용한 영역 문장)
  body4.push({ t: "head", text: P.en ? "• Something to look forward to before year-end" : "• 연말에 기대해도 좋은 일" });
  const hopeWindow: Window = { start: today, end: "2027-01-31" };
  const hope = scoreInWindow(
    events.filter((e) => e.kind === "transit" && e.transit === "jupiter" && !e.milestone && aspectGroup(e.aspect) !== "TENSE"),
    hopeWindow,
    answers.q1,
  )[0];
  if (hope && hope.event.kind === "transit") {
    const e = hope.event;
    const iv = hope.intervalsInWindow[0];
    const a8 = row(db, "A8", a8Id(e) ?? "");
    const exact = exactIn(e, hopeWindow);
    const jh = houseOfLon(base, dailyPositions("jupiter", [today])[0]);
    const a9 = row(db, "A9", `JUP_H${pad2(jh)}`);
    body4.push({
      t: "p",
      text: (P.en
        ? [
            `${rangeText(iv.from < today ? today : iv.from, iv.to)}: Jupiter forms a ${P.aspect(e.aspect)} with your ${pk(e.target)}${exact ? ` (exact on ${fd(exact)})` : ""}.`,
            a8?.text ?? "",
            a9 ? `Jupiter is now moving through your ${P.house(jh)} (${houseNick(db, jh)}). ${a9.table_line}` : "",
          ]
        : [
            `${rangeText(iv.from < today ? today : iv.from, iv.to)} 목성이 ${josa(POINT_KO[e.target], "와/과")} ${josa(e.aspect, "을/를")} 이룹니다${exact ? `(${formatDate(exact)} 정확)` : ""}.`,
            a8?.text ?? "",
            a9 ? `지금 목성은 ${jh}하우스(${houseNick(db, jh)})를 지나고 있어요. ${a9.table_line}` : "",
          ]
      ).filter(Boolean).join(" "),
    });
  } else {
    body4.push({ t: "p", text: [quiet, b8?.quiet_line ?? ""].filter(Boolean).join(" ") });
  }
  // 달마다 살펴볼 것(표 대신 줄글, 마스터스펙 6-1-1) — 역행은 시작 달에, 그 달의 느린 행성 트랜짓 하나를 덧붙인다.
  const months: Array<{ y: number; m: number; rx: CarefulItem[]; why: WhyItem[] }> = [];
  for (let d = `${today.slice(0, 7)}-01`; d <= w4.end; ) {
    const y = Number(d.slice(0, 4));
    const m = month(d);
    months.push({ y, m, rx: [], why: [] });
    d = m === 12 ? `${y + 1}-01-01` : `${y}-${pad2(m + 1)}-01`;
  }
  const lastYm = `${w4.end.slice(0, 7)}`;
  const slotOf = (ym: string) => months.find((x) => `${x.y}-${pad2(x.m)}` === ym);
  for (const x of careful) {
    const startYm = x.from.slice(0, 7);
    let sl = slotOf(startYm < today.slice(0, 7) ? today.slice(0, 7) : startYm > lastYm ? lastYm : startYm);
    // 같은 달에 항목이 이미 있으면 다음 달로 넘기는 건 역행만(프로토타입). 역행 뒤 정리·앞 준비는 시작한 달 칸에 둔다(owner 2026-11-02: 수성 정리는 11월 칸)
    if (x.phase === "rx" && sl && sl.rx.length && x.to && x.to.slice(0, 7) > `${sl.y}-${pad2(sl.m)}` && x.to <= w4.end) {
      const nx = months[months.indexOf(sl) + 1];
      if (nx && !nx.rx.length) sl = nx;
    }
    if (!sl) continue;
    sl.rx.push(x);
    sl.why.push({
      title: P.en ? `${pk(x.planet)} ${PHASE_KO[x.phase]} (${P.house(x.house)})` : `${POINT_KO[x.planet]} ${PHASE_KO[x.phase]} (${x.house}하우스)`,
      when: x.from > w4.end ? (P.en ? `starts ${fd(x.from, true)}` : `${formatDate(x.from, true)} 시작 예고`) : rangeText(x.from, x.to),
      meaning: x.prow.why_line ?? "",
    });
  }
  const tail4: Block[] = [{ t: "head", text: b11(db, "HEAD_EOY_MONTH") || (P.en ? "• Month by month: what to watch" : "• 달마다 살펴볼 것") }];
  const usedEv = new Set<string>();
  for (const mo of months) {
    const mw: Window = { start: `${mo.y}-${pad2(mo.m)}-01`, end: `${mo.y}-${pad2(mo.m)}-${pad2(new Date(Date.UTC(mo.y, mo.m, 0)).getUTCDate())}` };
    const act = scoreInWindow(
      events.filter((e) => e.kind === "transit" && SLOW.has(e.transit) && (e.milestone === null || e.milestone === "saturn_return") && e.intervals.some((iv) => iv.exact && iv.exact !== "2026-01-01")),
      mw,
      answers.q1,
    );
    for (const s of act.slice(0, 2)) {
      const ex = exactIn(s.event, mw) ?? exactIn(s.event);
      mo.why.push({ title: evName(s.event), when: ex ? (P.en ? `exact ${fd(ex)}` : `${formatDate(ex)} 정확`) : "", meaning: eventMeaning(db, s.event) });
    }
    const parts: string[] = [];
    for (const x of mo.rx) {
      const name = `${pk(x.planet)} ${PHASE_KO[x.phase]}`;
      const when = P.en
        ? x.phase === "rx" && x.from > w4.end
          ? `${pk(x.planet)} goes retrograde on ${fd(x.from, true)}.`
          : `${name.charAt(0).toUpperCase()}${name.slice(1)} runs ${rangeText(x.from, x.to)}.`
        : x.phase === "rx" && x.from > w4.end ? `${formatDate(x.from, true)}에 ${POINT_KO[x.planet]} 역행이 시작돼요.` : `${rangeText(x.from, x.to)} ${name} 기간이에요.`;
      parts.push(`${x.prow.careful_cell}. ${when} ${x.prow.why_line ?? ""}`.trim());
    }
    const top = act.find((s) => !usedEv.has(evName(s.event)) && a8Id(s.event) && row(db, "A8", a8Id(s.event)!));
    if (top) {
      usedEv.add(evName(top.event));
      const ex = exactIn(top.event, mw) ?? exactIn(top.event);
      parts.push(`${evName(top.event)}${ex ? (P.en ? ` (exact ${fd(ex)})` : `(${formatDate(ex)} 정확)`) : ""} — ${row(db, "A8", a8Id(top.event)!)!.table_future}`);
    }
    // 초승달·보름달(해석 DB A19, 기획 v0.3 — 4장에만): 오늘 이후 그 달의 것만, 날짜·별자리는 코드가 앞에 붙인다
    for (const l of lunations(mw.start < today ? today : mw.start, mw.end < w4.end ? mw.end : w4.end)) {
      const h = houseOfLon(base, l.lon);
      const kind = l.kind === "new" ? "초승달" : "보름달";
      const r = row(db, "A19", `LUNA_${l.kind === "new" ? "NEW" : "FULL"}_H${pad2(h)}`);
      if (!r?.line) continue;
      const sign = SIGNS[signIndex(l.lon)];
      parts.push(`${formatDate(l.date)} ${sign} ${kind} — ${r.line}`);
      mo.why.push({ title: `${sign} ${kind} (${h}하우스)`, when: formatDate(l.date), meaning: `${houseNick(db, h)}에 뜨는 ${kind}이에요.` });
    }
    if (!parts.length && quiet) parts.push(quiet);
    tail4.push({ t: "sub", text: `• ${P.month(mo.m)}` }, { t: "p", text: parts.join(" ") });
  }
  const why4: WhyGroup[] = months.map((mo) => ({ label: P.month(mo.m), items: mo.why }));

  // ================= 5. 2027년 =================
  const y27 = wish.years.find((y) => y.year === 2027);
  const themes = yearThemes(db, wish.years.map((y) => y.year), base);
  const th = themes[2027];
  const stages = flowStages(db, events, base);
  const body5: Block[] = [];
  const sum5 = y27 ? fillSummary(b11(db, "SUM_2027"), { 닉네임: nick, 바람: P.wish(wishWord), 판정: P.level(y27.level), 테마: th?.kw ?? "" }) : null;
  if (th?.row) {
    body5.push({
      t: "p",
      text: P.en
        ? `${nick}’s keyword for 2027 is ‘${th.kw}’. In the second half of the year, Jupiter moves through your ${P.house(th.house)} (${houseNick(db, th.house)}). ${th.row.table_line} ${th.row.opportunity} ${th.row.caution}`
        : `${nick}님의 2027년 키워드는 ‘${th.kw}’입니다. 하반기 목성이 ${th.house}하우스(${houseNick(db, th.house)})를 지나요. ${th.row.table_line} ${th.row.opportunity} ${th.row.caution}`,
    });
  }
  const bridgeBasis27 = flowBasis27(db, stages, withTime, base);
  let judge27 = "";
  if (y27) {
    body5.push({
      t: "head",
      text: P.en
        ? `• ${nick}’s 2027, hoping for ${P.wish(wishWord)} — ${P.level(y27.level)}${y27.movementLabel === "움직이는 해" ? " · ✦ Moving Year" : ""}`
        : `• ${josa(wishWord, "을/를")} 바라는 ${nick}님의 2027년 — ${WISH_LEVEL_DISPLAY[y27.level]}${y27.movementLabel === "움직이는 해" ? " · ✦ 움직이는 해" : ""}`,
    });
    const basis = evidencePhrase(db, y27.level === "역풍" ? topMinus(y27) : topPlus(y27)) ?? evidencePhrase(db, topPlus(y27)) ?? evidencePhrase(db, topMinus(y27)) ?? P.basisFallback;
    judge27 = tryFill(variant(wishRow(db, wishWord, y27.level)), { 근거: basis }) ?? "";
    if (judge27) body5.push({ t: "p", text: judge27 });
    // 바람과 흐름 잇기 — AI 4문장(06 v3.1). 뼈대는 B12 대체 문장.
    const br27 = findRow(db, "B12", (r) => r.section === "2027" && r.wish === wishWord);
    const br27Text = tryFill(br27?.text, { 흐름근거: bridgeBasis27 });
    if (br27Text) body5.push({ t: "bridge", text: br27Text });
    const ev27 = (fs: WishFactor[], asc: boolean) => {
      const byName = new Map<string, string[]>();
      for (const f of [...fs].sort((a, b) => (asc ? a.value - b.value : b.value - a.value))) byName.set(factorName(f), [...(byName.get(factorName(f)) ?? []), factorDate(f)]);
      return [...byName.entries()].slice(0, 2).map(([n, ds]) => (P.en ? `${n} (${ds.join(" · ")})` : `${n}(${ds.join("·")})`)).join(", ");
    };
    const pl = ev27(y27.factors.filter((f) => f.value > 0), false);
    const mi = ev27(y27.factors.filter((f) => f.value < 0), true);
    if (pl || mi) body5.push({ t: "note", text: [pl ? `${P.en ? "Helping currents" : "돕는 흐름"}: ${pl}` : "", mi ? `${P.en ? "Weight" : "무게"}: ${mi}` : ""].filter(Boolean).join(" · ") });
    // C등급(시간 모름)은 하우스·상승궁 없이 판정했다는 사실을 판정 곁에(마스터스펙 5-2). 문장은 DB(A15) 그대로.
    if (gradeC) body5.push({ t: "note", text: gradeC });
    const edge = edgeLines(db, y27);
    if (edge) body5.push({ t: "p", text: edge.line });
    const mv = y27.movementLabel === "움직이는 해" ? movementDetail(db, y27, base, mvLine(y27)) : mvLine(y27);
    if (mv) body5.push({ t: "p", text: mv });
  }
  if (b7) {
    body5.push({ t: "head", text: P.en ? "• What to let go of" : "• 놓아줄 것" }, { t: "p", text: b7.let_go }, { t: "head", text: P.en ? `• What to grow — ${P.competency(character.competency)}` : `• 키울 것 — ${character.competency}` }, { t: "p", text: b7.grow });
  }
  body5.push({ t: "head", text: b11(db, "HEAD_2027_FLOW") || (P.en ? "• How 2027 unfolds" : "• 2027년 흐름") });
  if (stages.some((s) => s.kind === "mars" || s.kind === "neptune")) body5.push({ t: "p", text: b11(db, "FLOW_METHOD_KEEP") });
  const review = [rxFrom(db, events, "venus", "2026-09-01", base), rxFrom(db, events, "mercury", "2026-10-01", base)].filter((x): x is Rx & { row: Record<string, string> } => !!x?.row);
  if (review.length) body5.push({ t: "step", label: b11(db, "PHASE_REVIEW") || (P.en ? "Late 2026 — Look back and review" : "2026년 연말 — 다시 보기"), text: review.map((x) => x.row.why_line).join(" ") });
  for (const s of stages) body5.push({ t: "step", label: s.label, text: s.text });
  // 분기 표: 단계 이름(화성 역행은 시작 분기만), 빈 분기는 그 분기 가운데 날 목성 하우스의 A9 한 줄
  const qPhases: string[][] = [[], [], [], []];
  for (const s of stages) for (const q of new Set(s.kind === "mars" ? [s.quarters[0]] : s.quarters)) qPhases[q - 1].push(s.phase);
  const MID = ["2027-02-15", "2027-05-15", "2027-08-15", "2027-11-15"];
  const QL = quarterLabels(P);
  const quarterRows: TableRow[] = QL.map((label, i) => ({
    label,
    cells: [qPhases[i].length ? qPhases[i].join(" · ") : t(db, "A9", `JUP_H${pad2(houseOfLon(base, dailyPositions("jupiter", [MID[i]])[0]))}`, "table_line")],
  }));
  const why5: WhyGroup[] = QL.map((label) => ({ label, items: [] as Array<WhyItem & { iso: string }> }));
  const put = (iso: string, it: WhyItem) => (why5[quarterOf(month(iso)) - 1].items as Array<WhyItem & { iso: string }>).push({ ...it, iso });
  if (y27) {
    const seen = new Set<string>();
    for (const f of y27.factors) {
      const iso = f.kind === "house" ? f.intervals[0].from : f.exact;
      const k = factorName(f) + iso;
      if (seen.has(k) || iso.slice(0, 4) !== "2027") continue;
      seen.add(k);
      put(iso, { title: `${f.value > 0 ? (P.en ? "Helping current" : "돕는 흐름") : P.en ? "Weight" : "무게"} · ${factorName(f)}`, when: factorDate(f), meaning: factorMeaning(db, f) });
    }
    for (const m of y27.moves) {
      if (m.exact.slice(0, 4) !== "2027") continue;
      const name = moveName(m);
      const meaning =
        m.kind === "outer" ? row(db, "A8", `TR_${POINT_ID[m.transit]}_${POINT_ID[m.target!]}_${aspectGroup(m.aspect!)}`)?.meaning_line ?? "" : m.kind === "saturn_ingress" ? ingressLine(db, "saturn", m.house, P.en ? "en" : "ko") : t(db, "A16", "TERM_RETURN", "meaning_line");
      put(m.exact, { title: `${P.en ? "Movement" : "움직임"} · ${name}`, when: fd(m.exact), meaning });
    }
  }
  for (const s of stages) {
    if (s.kind === "mars" && s.start) put(s.start, { title: P.en ? "Mars retrograde" : "화성 역행", when: rangeText(s.start, s.end ?? null), meaning: t(db, "A10", `RX_MARS_H${pad2(s.house!)}`, "why_line") });
    if (s.kind === "jupiter" && s.date) put(s.date, { title: P.en ? `Jupiter moves into ${P.sign(s.sign ?? "")}${s.house ? ` (${P.house(s.house)})` : ""}` : `목성 ${s.sign}${s.house ? `(${s.house}하우스)` : ""} 이동`, when: fd(s.date), meaning: ingressLine(db, "jupiter", s.house, P.en ? "en" : "ko") });
  }
  for (const g of why5) (g.items as Array<WhyItem & { iso: string }>).sort((a, b) => (a.iso < b.iso ? -1 : 1));
  const why5Clean: WhyGroup[] = why5.map((g) => ({ label: g.label, items: g.items.map(({ title, when, meaning }) => ({ title, when, meaning })) }));

  // ================= 6. 앞으로 5년 =================
  const years = wish.years;
  const first = years.find((y) => y.level === "순풍") ?? null;
  const near = first ? null : [...years].sort((a, b) => b.support - a.support)[0] ?? null;
  const openRow = wishRow(db, wishWord, "열리는 해");
  const body6: Block[] = [];
  let sum6: string | null;
  let open6: string | null;
  if (first) {
    sum6 = fillSummary(b11(db, "SUM_5Y_OPEN"), { 닉네임: nick, 바람: P.wish(wishWord), 열리는해: P.year(first.year) });
    open6 = tryFill(variant(openRow), { 열리는해: P.year(first.year), 근거: evidencePhrase(db, topPlus(first)) ?? P.basisOpenFallback });
  } else {
    sum6 = near ? fillSummary(b11(db, "SUM_5Y_NEAR"), { 닉네임: nick, 바람: P.wish(wishWord), 가까운해: P.year(near.year) }) : null;
    open6 = near ? tryFill(variant(openRow, "fallback_text"), { 가까운해: P.year(near.year) }) : null;
  }
  if (open6) body6.push({ t: "p", text: open6 });
  const desiredYear = first?.year ?? near?.year ?? null;
  const br5 = findRow(db, "B12", (r) => r.section === "5년" && r.wish === wishWord);
  const br5Text = desiredYear ? tryFill(br5?.text, { 바라던해: P.year(desiredYear) }) : null;
  if (br5Text) body6.push({ t: "bridge", text: br5Text });
  const edgeY = years.find((y) => y.year !== 2027 && y.edge);
  if (edgeY) {
    const e = edgeLines(db, edgeY);
    if (e) body6.push({ t: "head", text: P.en ? `• ${edgeY.year} — ${P.level(edgeY.level)}, ${e.badge}` : `• ${edgeY.year}년 — ${WISH_LEVEL_DISPLAY[edgeY.level]}, ${e.badge}` }, { t: "p", text: `${e.line} ${e.edgeLine}` });
  }
  const headY = years.filter((y) => y.level === "역풍");
  if (headY.length) {
    const hr = wishRow(db, wishWord, "역풍");
    const filled = tryFill(variant(hr, "text", "5y"), { 근거: evidencePhrase(db, topMinus(headY[0])) ?? P.basisHeadFallback });
    if (filled)
      body6.push(
        { t: "head", text: P.en ? `• ${headY.map((y) => y.year).join(" · ")} — ${headY.length > 1 ? "Building Years" : "a Building Year"}, named honestly` : `• ${headY.map((y) => y.year).join("·")}년 — 기반을 다지는 해(역풍)도 솔직하게` },
        { t: "p", text: yearize(filled, headY[0].year) },
      );
  }
  for (const y of years.filter((x) => x.movementLabel === "움직이는 해")) {
    const d = movementDetail(db, y, base, mvLine(y));
    if (d) body6.push({ t: "head", text: P.en ? `• ${y.year} — ✦ Moving Year` : `• ${y.year}년 — ✦ 움직이는 해` }, { t: "p", text: d });
  }
  const stars: TimelineStar[] = [];
  // 5년 표(프로토타입 render5y): 연도 | {바람} — 이루어짐 · 움직임 | 한 해의 테마. 경계 표시는 EDGE_LABEL(프로토타입 l.edge).
  const fiveRows: TableRow[] = years.map((y) => {
    const edge = y.edge ? P.edge(y.edge, EDGE_LABEL[y.edge]) : "";
    const cell = P.en
      ? P.level(y.level) +
        (y.movementLabel ? ` · ${y.movementLabel === "움직이는 해" ? "✦ " : ""}${P.movement(y.movementLabel)}` : "") +
        (edge ? ` — ${edge}` : "") +
        (first && y.year === first.year ? ` — your Open Year for ${P.wish(wishWord)}` : "")
      : WISH_LEVEL_DISPLAY[y.level] +
        (y.movementLabel === "움직이는 해" ? " · ✦ 움직이는 해" : y.movementLabel === "잔잔한 해" ? " · 잔잔한 해" : "") +
        (edge ? ` — ${edge}` : "") +
        (first && y.year === first.year ? ` — ${josa(wishWord, "이/가")} 열리는 해` : "");
    const theme = themes[y.year]?.kw ?? "";
    stars.push({ year: y.year, level: y.level, display: P.level(y.level), edgeBadge: edge || null, movement: y.movementLabel, firstOpen: !!first && y.year === first.year, theme });
    return { label: String(y.year), cells: [cell, theme] };
  });
  const why6: WhyGroup[] = years.map((y) => {
    const items: WhyItem[] = [];
    for (const f of [...y.factors].filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 4)) items.push({ title: `${P.en ? "Helping current" : "돕는 흐름"} · ${factorName(f)}`, when: factorDate(f), meaning: factorMeaning(db, f) });
    for (const f of [...y.factors].filter((x) => x.value < 0).sort((a, b) => a.value - b.value).slice(0, 3)) items.push({ title: `${P.en ? "Weight" : "무게"} · ${factorName(f)}`, when: factorDate(f), meaning: factorMeaning(db, f) });
    for (const m of y.moves) {
      const name = moveName(m);
      const meaning =
        m.kind === "outer" ? row(db, "A8", `TR_${POINT_ID[m.transit]}_${POINT_ID[m.target!]}_${aspectGroup(m.aspect!)}`)?.meaning_line ?? "" : m.kind === "saturn_ingress" ? ingressLine(db, "saturn", m.house, P.en ? "en" : "ko") : t(db, "A16", "TERM_RETURN", "meaning_line");
      items.push({ title: `${P.en ? "Movement" : "움직임"} · ${name}`, when: fd(m.exact), meaning });
    }
    return { label: P.en ? `${y.year} · ${P.level(y.level)}${y.movementLabel ? ` · ${P.movement(y.movementLabel)}` : ""}` : `${y.year}년 · ${WISH_LEVEL_DISPLAY[y.level]}${y.movementLabel ? ` · ${y.movementLabel}` : ""}`, items };
  });

  // ================= 7. 질문과 실천 =================
  const qb = findRow(db, "A17a", (r) => r.competency === character.competency && r.wish === answers.q3);
  const temp = row(db, "A17b", `TEMP_${ELEMENT_ID[elementOf(L.sun)]}_${ELEMENT_ID[elementOf(L.moon)]}`);
  const prac = findRow(db, "A14", (r) => r.competency === character.competency && r.domain === answers.q1);
  const minutes = (prac?.minutes ?? "").split(" · ");
  const practices = prac
    ? [1, 2, 3]
        .map((i) => ({
          title: prac[`p${i}_title`],
          how: prac[`p${i}_how`],
          why: prac[`p${i}_why`],
          condition: prac[`p${i}_condition`],
          minutes: minutes[i - 1] && minutes[i - 1] !== "-" ? minutes[i - 1] : "",
        }))
        .filter((p) => p.title)
    : [];
  const questions = {
    headline: qb?.headline_q ?? "",
    items: qb ? [qb.q1, qb.q2, qb.q3].filter(Boolean) : [],
    why: tryFill(qb?.why_template, { 기질문장: temp?.temperament_line ?? "" }),
  };
  const closing = t(db, "A15", "FIX_SOWELLA_3DAY", "text").replace(/\s*→\s*\[.*\]\s*$/, "");
  const sum7 = questions.headline ? fillSummary(b11(db, "SUM_QUESTION"), { 닉네임: nick, 대표질문: questions.headline }) : null;
  const body7: Block[] = questions.why ? [{ t: "p", text: questions.why }] : [];

  const sections: PaidSection[] = [
    { no: 4, title: P.en ? "What to watch for until the end of the year" : "연말까지 조심하면 좋을 것", summary: sum4, body: body4, tail: tail4, table: null, why: why4 },
    { no: 5, title: P.en ? "Your mindset for 2027" : "2027년을 맞는 마음가짐", summary: sum5, body: body5, tail: [], table: { columns: P.en ? ["Period", "Mindset"] : ["시기", "마음가짐"], rows: quarterRows }, why: why5Clean },
    {
      no: 6, title: P.en ? `The next five years, ${nick}: how your life may flow` : `앞으로 5년, ${nick}님의 삶은 이렇게 흘러갈 거예요`, summary: sum6, body: body6, tail: [],
      table: { columns: P.en ? ["Year", `${P.wish(wishWord)} — fulfillment · movement`, "Theme of the year"] : ["연도", `${wishWord} — 이루어짐 · 움직임`, "한 해의 테마"], rows: fiveRows }, stars, commonSky: commonSky(db), why: why6,
    },
    { no: 7, title: P.en ? "Questions from the stars and wellness suggestions" : "별이 주는 질문과 웰니스 제안", summary: sum7, body: body7, tail: [], table: null, why: [] },
  ];
  const texts = (bs: Block[]) => bs.filter((b) => b.t !== "head" && b.t !== "sub" && b.t !== "note" && b.t !== "bridge").map(blockText);
  return {
    sections,
    questions,
    practices,
    closing,
    dbSentences: {
      // 조심할 세 가지 목록은 서버가 그대로 붙이므로 AI 하한선에서 뺀다(넣으면 AI가 요약 뒤에 같은 문장을 또 붙였다)
      4: texts(body4.filter((b) => b.t !== "items")),
      // 판정 문장은 꼭 들어가야 하는 하한선. 유형을 풀어 쓸 때의 바탕(A6 역량·방식 쉬운 정의, 06 프롬프트 v3 '캐릭터 표기')
      5: [...texts(body5), ...(gradeC ? [gradeC] : []), ...[a6Line(db, "역량", character.competency), a6Line(db, "방식", character.style)].filter((x): x is string => !!x)],
      6: texts(body6),
      7: [...texts(body7), ...practices.map((p) => `${p.title}: ${p.how} ${p.why}`)],
    },
    bridgeBasis27,
    desiredYear,
    careful4: (() => {
      const i = body4.findIndex((b) => b.t === "head" && (b.text.includes("조심할 세 가지") || b.text.includes("연말에 살펴볼 것") || b.text.includes("before year-end") && !b.text.includes("look forward")));
      const items = body4[i + 1];
      return i >= 0 && items?.t === "items" ? [body4[i], items] : [];
    })(),
  };
}

/** 판정 문장(잇기와 겹침 검사용) */
export function judgementSentence(skeleton: PaidSkeleton, no: 5 | 6): string {
  const s = skeleton.sections.find((x) => x.no === no);
  const i = s?.body.findIndex((b) => b.t === "bridge") ?? -1;
  const before = s && i > 0 ? s.body.slice(0, i).filter((b) => b.t === "p") : [];
  return before.length ? (before[before.length - 1] as { text: string }).text : "";
}

