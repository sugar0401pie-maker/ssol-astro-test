// 유료 섹션(4~7) 뼈대 — 해석 DB 문장과 엔진 계산값만으로 조립한다(AI 0회).
// 쓰임: ① AI에게 주는 'DB 문장(하한선)'과 표·접힌 근거 ② AI가 실패하면 이 뼈대가 그대로 리포트가 된다(fail safe).
// 표·접힌 근거·질문·실천은 AI를 거치지 않는다(마스터스펙 7-1 ⑤ — 화면의 날짜와 본문의 날짜가 어긋날 수 없게).
import type { Answers } from "../astro/answers.ts";
import type { CharacterResult } from "../astro/character.ts";
import { elementOf, type PointKey } from "../astro/constants.ts";
import type { Longitudes, NatalChart } from "../astro/natal.ts";
import { clipIntervals, groupRows, type PeriodKey, type PeriodResult, type ScoredEvent, type TimelineEvent, type Unit } from "../astro/timeline.ts";
import { WISH_LEVEL_DISPLAY, type MovementLabel, type WishFactor, type WishLevel, type WishResult } from "../astro/wish.ts";
import { ELEMENT_ID, aspectGroup, findRow, pad2, row, tryFill, type AstroDb } from "./db.ts";
import { a8Id } from "./freeResult.ts";
import { formatDate, formatRanges, josa, QUARTER_LABELS } from "./format.ts";
import { POINT_KO, eventLabel } from "./labels.ts";
import { edgeLines, flowSteps, movementLine } from "./movement.ts";

export interface TableRow {
  label: string;
  cells: string[];
  reasons: Array<{ title: string; when: string; meaning: string }>;
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
  /** DB 문장 문단(AI가 실패하면 이게 본문) */
  paragraphs: string[];
  table: { columns: string[]; rows: TableRow[] } | null;
  /** 5번: '2027년 흐름 한눈에' 단계(화살표 한 줄 / 모바일 세로 칩) */
  flow?: string[];
  /** 6번: 5년 타임라인 별 */
  stars?: TimelineStar[];
}

export interface PaidSkeleton {
  sections: PaidSection[];
  /** 7번 섹션: 질문·실천은 DB 그대로(AI는 이유 문장만) */
  questions: { headline: string; items: string[]; why: string | null };
  practices: Array<{ title: string; how: string; why: string; condition: string; minutes: string }>;
  closing: string;
  /** AI 입력 {db_sentences}(빠짐없이 리포트에 들어가야 하는 하한선) — 섹션별 */
  dbSentences: Record<4 | 5 | 6 | 7, string[]>;
}

const t = (db: AstroDb, table: string, id: string, col: string) => row(db, table, id)?.[col] ?? "";
const KO: Record<string, string> = { mercury: "MERCURY", venus: "VENUS", mars: "MARS" };

/** 이벤트 하나의 '왜 그럴까' 한 줄(접힌 근거) */
function reason(db: AstroDb, s: ScoredEvent): { title: string; when: string; meaning: string } {
  const e = s.event;
  const when = s.intervalsInWindow.length === 1 && s.intervalsInWindow[0].exact ? formatDate(s.intervalsInWindow[0].exact) : formatRanges(s.intervalsInWindow, true);
  if (e.kind === "retrograde" && e.house) {
    const r = row(db, "A10", `RX_${KO[e.planet]}_H${pad2(e.house)}`);
    return { title: `${POINT_KO[e.planet]} 역행(${e.house}하우스)`, when, meaning: r?.why_line ?? t(db, "A16", "TERM_RX", "meaning_line") };
  }
  const id = a8Id(e);
  const a8 = id ? row(db, "A8", id) : null;
  if (a8) return { title: a8.title, when, meaning: a8.meaning_line };
  const term = e.kind === "retrograde" ? "TERM_RX" : e.kind === "ingress" ? "TERM_INGRESS" : e.kind === "eclipse" ? (e.eclipse === "solar" ? "TERM_SOLAR_ECLIPSE" : "TERM_LUNAR_ECLIPSE") : null;
  return { title: eventLabel(e), when, meaning: term ? t(db, "A16", term, "meaning_line") : "" };
}

/** 표 칸 문장: 역행은 A10(무엇을 조심할까), 느린 행성 트랜짓은 A8 미래형. */
function cellFor(db: AstroDb, e: TimelineEvent, kind: "careful" | "future"): string | null {
  if (e.kind === "retrograde" && e.house) {
    const r = row(db, "A10", `RX_${KO[e.planet]}_H${pad2(e.house)}`);
    return r ? (kind === "careful" ? r.careful_cell : r.action) : null;
  }
  const id = a8Id(e);
  return id ? row(db, "A8", id)?.table_future ?? null : null;
}

function tableRows(db: AstroDb, p: PeriodResult, unit: Unit, kind: "careful" | "future"): TableRow[] {
  return groupRows(p.all, p.window, unit).map((r) => {
    const cells = r.events.map((s) => cellFor(db, s.event, kind)).filter((x): x is string => !!x);
    const label = unit === "month" ? `${r.index}월` : unit === "quarter" ? QUARTER_LABELS[r.index - 1] : `${r.index}년`;
    return { label, cells: [[...new Set(cells)].slice(0, 2).join(" ") || "—"], reasons: r.events.slice(0, 3).map((s) => reason(db, s)) };
  });
}

/** A13 {{근거}} 구절("-는"으로 끝남, 예: "목성이 집·뿌리의 자리를 지나는"). 근거 요인 하나로 만든다. */
export function evidencePhrase(db: AstroDb, f: WishFactor | undefined): string | null {
  if (!f) return null;
  const planet = POINT_KO[f.transit];
  if (f.kind === "house") {
    const nick = t(db, "A16", `TERM_H${pad2(f.house)}`, "nickname");
    return nick ? `${josa(planet, "이/가")} ${josa(nick, "을/를")} 지나는` : null;
  }
  if (f.target.startsWith("H")) return null;
  const target = `태어날 때의 ${POINT_KO[f.target as PointKey]}`;
  const g = aspectGroup(f.aspect);
  if (g === "CONJ") return `${josa(planet, "이/가")} ${target} 자리에 겹치는`;
  return `${josa(planet, "이/가")} ${josa(target, "와/과")} ${g === "HARM" ? "자연스럽게 돕는" : "긴장하는"} 각도를 이루는`;
}

/** A13 행 — v1.2부터 판정 칸이 두 말 함께 표기("활짝 열리는 해(순풍)")와 "열리는 해"다. */
function wishRow(db: AstroDb, wish: string, level: WishLevel | "열리는 해") {
  const label = level === "열리는 해" ? level : WISH_LEVEL_DISPLAY[level];
  return findRow(db, "A13", (r) => r.wish === wish && r.level === label);
}

/** 그해 목성이 가장 오래 머무는 하우스(A·B등급만). */
function jupiterHouseIn(events: TimelineEvent[], year: number, natalAsc: number | undefined): number | null {
  if (natalAsc === undefined) return null;
  const ing = events
    .filter((e): e is Extract<TimelineEvent, { kind: "ingress" }> => e.kind === "ingress" && e.planet === "jupiter" && e.house !== null)
    .sort((a, b) => (a.intervals[0].from < b.intervals[0].from ? -1 : 1));
  const mid = `${year}-07-01`;
  let house: number | null = null;
  for (const e of ing) if (e.intervals[0].from <= mid) house = e.house;
  return house;
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
}): PaidSkeleton {
  const { db, longitudes, character, answers, events, periods, wish, nickname } = args;
  const b8 = findRow(db, "B8", (r) => r.domain === answers.q1);
  const b7 = findRow(db, "B7", (r) => r.character === character.name);

  // ---- 4. 연말까지 ----
  const eoy = periods.eoy;
  const p4: string[] = [];
  if (b8) p4.push(eoy.domainQuiet ? b8.quiet_line : b8.focus_intro);
  for (const s of eoy.top) {
    const e = s.event;
    if (e.kind === "retrograde" && e.house) {
      const r = row(db, "A10", `RX_${KO[e.planet]}_H${pad2(e.house)}`);
      if (r) p4.push(`${r.text} ${r.action}`);
    } else {
      const id = a8Id(e);
      const text = id ? row(db, "A8", id)?.text : null;
      if (text) p4.push(text);
    }
  }
  const tailwind = eoy.all.find((s) => {
    const id = a8Id(s.event);
    return id && row(db, "A8", id)?.tone === "순풍";
  });
  if (tailwind) p4.push(t(db, "A8", a8Id(tailwind.event)!, "text"));

  // ---- 5. 2027년 ----
  const y27 = wish.years.find((y) => y.year === 2027);
  const p5: string[] = [];
  const jh = jupiterHouseIn(events, 2027, longitudes.asc);
  if (jh) {
    const a9 = row(db, "A9", `JUP_H${pad2(jh)}`);
    if (a9) p5.push(`${a9.text} ${a9.opportunity}`);
  }
  if (y27) {
    const w = wishRow(db, answers.q3, y27.level);
    const filled = tryFill(w?.text, { 근거: evidencePhrase(db, y27.reasons[0]) ?? "" });
    if (filled && !(y27.level !== "보통" && !evidencePhrase(db, y27.reasons[0]))) p5.push(filled);
    const edge = edgeLines(db, y27);
    if (edge) p5.push(`${edge.line} ${edge.edgeLine}`);
    // 움직임은 판정 뒤에 한 문장(B9 기질 버전, 마스터스펙 5-3)
    const mv = movementLine(db, y27, wish.temperament, answers.q3);
    if (mv) p5.push(mv);
  }
  if (b7) p5.push(`놓아줄 것 — ${b7.let_go}`, `키울 것 — ${b7.grow}`);

  // ---- 6. 앞으로 5년 ----
  const p6: string[] = [];
  const open = wishRow(db, answers.q3, "열리는 해");
  if (wish.firstOpenYear) {
    const y = wish.years.find((x) => x.year === wish.firstOpenYear)!;
    const filled = tryFill(open?.text, { 열리는해: `${wish.firstOpenYear}년`, 근거: evidencePhrase(db, y.reasons[0]) ?? "" });
    if (filled && evidencePhrase(db, y.reasons[0])) p6.push(filled);
  } else if (wish.closestYear) {
    const filled = tryFill(open?.fallback_text, { 가까운해: `${wish.closestYear}년` });
    if (filled) p6.push(filled);
  }
  // 기반을 다지는 해(역풍) 문단은 A13 문장이 '다가오는 해(2027)' 기준이라 다른 해에 쓰지 않는다(DB 문장을 코드에서 고치지 않음) — AI가 {{역풍해}} 토큰으로 쓴다.
  for (const s of periods.fiveYears.top) {
    const id = a8Id(s.event);
    const text = id ? row(db, "A8", id)?.text : null;
    if (text && !p6.includes(text)) p6.push(text);
  }
  const stars: TimelineStar[] = [];
  const fiveRows: TableRow[] = wish.years.map((y) => {
    const short = wishRow(db, answers.q3, y.level)?.short_line ?? WISH_LEVEL_DISPLAY[y.level];
    const edge = edgeLines(db, y);
    const level = [short, edge ? `(${edge.badge})` : "", y.movementLabel ? `· ${y.movementLabel}` : ""].filter(Boolean).join(" ");
    const jhY = jupiterHouseIn(events, y.year, longitudes.asc);
    const theme = jhY ? t(db, "A9", `JUP_H${pad2(jhY)}`, "keyword") : "";
    stars.push({
      year: y.year, level: y.level, display: WISH_LEVEL_DISPLAY[y.level], edgeBadge: edge?.badge ?? null,
      movement: y.movementLabel, firstOpen: y.year === wish.firstOpenYear, theme,
    });
    const w = { start: `${y.year}-01-01`, end: `${y.year}-12-31` };
    const rs = periods.fiveYears.all.filter((s) => clipIntervals(s.event.intervals, w).length).slice(0, 3);
    return {
      label: `${y.year}년`,
      cells: [level, theme || "—"],
      reasons: rs.map((s) => reason(db, { ...s, intervalsInWindow: clipIntervals(s.event.intervals, w) })),
    };
  });

  // ---- 7. 질문과 실천 ----
  const qb = findRow(db, "A17a", (r) => r.competency === character.competency && r.wish === answers.q3);
  const temp = row(db, "A17b", `TEMP_${ELEMENT_ID[elementOf(longitudes.sun)]}_${ELEMENT_ID[elementOf(longitudes.moon)]}`);
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
  const p7 = [questions.headline ? `${nickname}님께 별이 드리는 질문은 '${questions.headline}'입니다.` : "", questions.why ?? ""].filter(Boolean);

  const sections: PaidSection[] = [
    { no: 4, title: "연말까지 조심하면 좋을 것", paragraphs: p4, table: { columns: ["시기", "무엇을 조심할까"], rows: tableRows(db, eoy, "month", "careful") } },
    { no: 5, title: "2027년을 맞는 마음가짐", paragraphs: p5, table: { columns: ["시기", "마음가짐"], rows: tableRows(db, periods.year2027, "quarter", "future") }, flow: flowSteps(events, eoy) },
    { no: 6, title: `앞으로 5년, ${nickname}님의 삶은 이렇게 흘러갈 거예요`, paragraphs: p6, table: { columns: ["연도", "바람", "한 해의 테마"], rows: fiveRows }, stars },
    { no: 7, title: "별이 주는 질문과 웰니스 제안", paragraphs: p7, table: null },
  ];
  return {
    sections,
    questions,
    practices,
    closing,
    dbSentences: {
      4: p4,
      5: p5,
      6: p6,
      7: [...p7, ...practices.map((p) => `${p.title}: ${p.how} ${p.why}`)],
    },
  };
}


