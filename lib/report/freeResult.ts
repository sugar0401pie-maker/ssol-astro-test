// 무료 구간(1~3번 섹션) 화면 데이터 조립 — AI 호출 0회(마스터스펙 6-2), 문장은 전부 해석 DB(A1~A18, B1·B2·B6)에서.
// 유료 섹션(4~7)은 제목만 보낸다 — 본문을 브라우저에 보내고 블러로 가리면 결제 없이 볼 수 있기 때문.
// 휠 탭 시트도 같은 이유로, 태양·달·상승궁 외 행성은 첫 문장만 보낸다(나머지는 유료).
// DB 문장의 토큰을 못 채우면 그 문장은 빼고 보여준다(fail safe) — 빈칸·괄호가 화면에 나가지 않게.
import { isSoftTone, type Answers, type Q2Word } from "../astro/answers.ts";
import type { CharacterResult } from "../astro/character.ts";
import { SHOW_CHARACTER, characterLabel } from "./characterDisplay.ts";
import { CHARACTER_GRID, ELEMENTS, SIGNS, STYLES, STYLE_BY_ELEMENT, elementOf, type Element, type PointKey } from "../astro/constants.ts";
import type { Accuracy, Longitudes, NatalChart } from "../astro/natal.ts";
import {
  buildTimeline, clipIntervals, groupRows, periodFilter, scoreInWindow, turningPoints, type ScoredEvent, type TimelineEvent,
} from "../astro/timeline.ts";
import { POINT_ID, SIGN_ID, ELEMENT_ID, aspectGroup, firstSentence, findRow, pad2, row, tryFill, type AstroDb } from "./db.ts";
import { formatDate, formatRanges, QUARTER_LABELS } from "./format.ts";
import { POINT_KO, eventLabel } from "./labels.ts";

export const PAID_SECTION_TITLES = [
  { no: 4, title: "연말까지 조심하면 좋을 것" },
  { no: 5, title: "2027년을 맞는 마음가짐" },
  { no: 6, title: "앞으로 5년, {닉네임}님의 삶은 이렇게 흘러갈 거예요" },
  { no: 7, title: "별이 주는 질문과 웰니스 제안" },
] as const;

export interface WheelSheet {
  title: string;
  lines: string[];
  /** 무료로는 일부만 보낸 시트(나머지는 결제 후) */
  partial: boolean;
}

export interface FreeResult {
  dbVersion: string;
  /** DB 상태가 DRAFT(상담사 검수 전)면 화면에 작게 표시 — 검수가 끝나 상태가 바뀌면 자동으로 사라진다. */
  dbDraft: boolean;
  /** 점성술이 처음인 사람에게 태양·달·상승궁 용어 한 줄 설명(A16, 마스터스펙 6-1 기타) */
  terms: Array<{ name: string; line: string }>;
  accuracy: Accuracy;
  gradeNote: string;
  /** B·C등급: "태어난 시간을 알면 더 정확해져요" 안내(A15 FIX_ADD_TIME) */
  addTimeNote: string | null;
  chart: NatalChart;
  elements: { strong: { element: Element; text: string; styleLink: string } | null; weak: Array<{ element: Element; text: string }> };
  /** 휠 탭 시트. lines 키는 lineKey(a, b, aspect) — 각도 선(B3, 이 차트에 있는 선만) */
  wheelSheets: { planets: Partial<Record<PointKey, WheelSheet>>; signs: Record<string, WheelSheet>; lines: Record<string, WheelSheet> };
  /** 처음인 사용자의 휠 3단계 안내 말풍선(A15 FIX_WHEEL_TIP_1~3) */
  wheelTips: string[];
  character: {
    /** 동물 이름 — SHOW_CHARACTER가 false면 null(브라우저에 보내지 않는다) */
    name: string | null;
    /** 유형 한 줄(A5 type_line) */
    typeLine: string;
    competency: string;
    style: string;
    why: string;
    /** SHOW_CHARACTER일 때만(이야기형 소개·강점 등) */
    intro: string | null;
    strength: string | null;
    energyMoment: string | null;
    careTip: string | null;
    sunMoonLine: string | null;
    /** A6 역량·방식 쉬운 정의(유형 설명 바탕 — 마스터스펙 6장, 06 프롬프트 v3) */
    competencyLine: string | null;
    styleLine: string | null;
  };
  big3: Array<{ key: "sun" | "moon" | "asc"; label: string; sign: string; house: number | null; line: string }>;
  sunSign: string;
  /** 휠 가운데 별자리 기호용(0=양자리) */
  sunSignIndex: number;
  softTone: boolean;
  year2026: {
    intro: string;
    turningPoints: string[];
    quarters: Array<{ label: string; cell: string; reasons: Array<{ title: string; when: string; meaning: string }> }>;
    closing: string;
  };
  /** 부드러운 톤(Q2 그만하자·이별·고생)일 때 결과 하단 카드 */
  care: { note: string; card: string } | null;
  paywallBox: string;
  disclaimer: string;
  paidSections: typeof PAID_SECTION_TITLES;
}

const text = (db: AstroDb, table: string, id: string, col: string) => row(db, table, id)?.[col] ?? "";

const BIG3_LABEL = { sun: "태양 (삶의 중심)", moon: "달 (감정의 욕구)", asc: "상승궁 (첫인상)" } as const;

// ---- 4원소 ----

/**
 * A7은 "강할 때·부족할 때의 점수 경계는 엔진에서 정한다"고 했다. 여기서 정한 경계(Claude 판단, owner 검토 가능):
 * 강함 = 캐릭터 방식을 정한 원소(가장 강한 원소, 동점이면 달→태양 원소) 하나, 부족함 = 0점인 원소.
 */
export function elementTexts(db: AstroDb, elements: Record<Element, number>, dominant: Element): FreeResult["elements"] {
  const strongRow = row(db, "A7", `ELEM_${ELEMENT_ID[dominant]}_STRONG`);
  return {
    strong: strongRow ? { element: dominant, text: strongRow.text, styleLink: strongRow.style_link } : null,
    weak: ELEMENTS.filter((e) => elements[e] === 0).map((e) => ({ element: e, text: text(db, "A7", `ELEM_${ELEMENT_ID[e]}_WEAK`, "text") })),
  };
}

// ---- 휠 탭 시트 ----

function planetSheet(db: AstroDb, key: PointKey, chart: NatalChart): WheelSheet | null {
  const p = chart.planets[key];
  if (!p) return null;
  const sid = SIGN_ID[p.sign];
  const houseLine = p.house ? row(db, ["jupiter", "saturn", "uranus", "neptune", "pluto"].includes(key) ? "B2b" : "B2a", `HS_${POINT_ID[key]}_H${pad2(p.house)}`) : null;
  const title = `${POINT_KO[key]} · ${p.sign}${p.house ? ` · ${p.house}하우스` : ""}`;
  // 태양·달·상승궁은 무료: 본문 전체
  if (key === "sun" || key === "moon" || key === "asc") {
    const table = key === "sun" ? "A2" : key === "moon" ? "A3" : "A4";
    const lines = [text(db, table, `${POINT_ID[key]}_${sid}`, "text")];
    if (houseLine?.short_line) lines.push(houseLine.short_line);
    return { title, lines: lines.filter(Boolean), partial: false };
  }
  if (key === "mc") return { title, lines: [text(db, "A16", "TERM_MC", "meaning_line")].filter(Boolean), partial: false };
  // 나머지 행성: 첫 문장만(나머지는 결제 후)
  const signRow = row(db, "B1a", `PL_${POINT_ID[key]}_${sid}`) ?? row(db, "B1b", `PL_${POINT_ID[key]}_${sid}`);
  const lines = [signRow?.short_line ? firstSentence(signRow.short_line) : text(db, "A16", `TERM_${POINT_ID[key]}`, "meaning_line")];
  return { title, lines: lines.filter(Boolean), partial: true };
}

/** A6 '쉬운 정의' 한 줄(역량·방식). */
export function a6Line(db: AstroDb, kind: "역량" | "방식", name: string): string | null {
  return findRow(db, "A6", (r) => r.kind === kind && r.name === name)?.plain || null;
}

/** 각도 선 시트 키 — 브라우저(BirthChartWheel)와 같은 규칙. */
export function lineKey(a: string, b: string, aspect: string): string {
  return `${a}|${b}|${aspect}`;
}

const ASPECT_TERM: Record<string, string> = { 합: "TERM_CONJ", 육분: "TERM_SEXTILE", 사각: "TERM_SQUARE", 삼분: "TERM_TRINE", 충: "TERM_OPPOSITION" };

/**
 * 각도 선 탭 시트(B3: 제목 + 선 탭 한 줄 + 해석 2문장). 행성 순서가 반대로 적힌 행도 찾는다.
 * B3에는 개인 행성·목성·토성 쌍만 있어서, 천왕성·해왕성·명왕성이 낀 선은 A16 용어 문장(각도 뜻 + 두 행성 뜻)으로 보여 준다.
 */
function lineSheets(db: AstroDb, chart: NatalChart): Record<string, WheelSheet> {
  const out: Record<string, WheelSheet> = {};
  const group = (a: string) => (a === "합" ? "CONJ" : a === "삼분" || a === "육분" ? "HARM" : "TENSE");
  for (const asp of chart.aspects) {
    const g = group(asp.aspect);
    const key = lineKey(asp.a, asp.b, asp.aspect);
    const r = row(db, "B3", `ASP_${POINT_ID[asp.a]}_${POINT_ID[asp.b]}_${g}`) ?? row(db, "B3", `ASP_${POINT_ID[asp.b]}_${POINT_ID[asp.a]}_${g}`);
    if (r) {
      out[key] = { title: `${r.title}(${asp.aspect})`, lines: [r.line_meaning, r.text].filter(Boolean), partial: false };
      continue;
    }
    const lines = [
      text(db, "A16", ASPECT_TERM[asp.aspect], "meaning_line"),
      `${POINT_KO[asp.a]}: ${text(db, "A16", `TERM_${POINT_ID[asp.a]}`, "meaning_line")}`,
      `${POINT_KO[asp.b]}: ${text(db, "A16", `TERM_${POINT_ID[asp.b]}`, "meaning_line")}`,
    ].filter((l) => !l.endsWith(": "));
    if (lines[0]) out[key] = { title: `${POINT_KO[asp.a]}-${POINT_KO[asp.b]} ${asp.aspect}`, lines, partial: false };
  }
  return out;
}

function signSheets(db: AstroDb): Record<string, WheelSheet> {
  const out: Record<string, WheelSheet> = {};
  for (const sign of SIGNS) {
    const r = row(db, "A1", `SIGN_${SIGN_ID[sign]}`);
    if (r) out[sign] = { title: `${r.sign} · ${r.dates}`, lines: [r.one_liner, r.term_note].filter(Boolean), partial: false };
  }
  return out;
}

// ---- 2026 회고 ----

const HEAVY_WORDS: ReadonlySet<Q2Word> = new Set(["버텨", "고생", "그만하자", "멈춤", "이별"]);
const LIGHT_WORDS: ReadonlySet<Q2Word> = new Set(["성취", "설렘", "시작", "배움"]);

/** A8 행 ID(TR_{행성}_{대상}_{CONJ|HARM|TENSE}, 토성 리턴은 TR_SATURN_RETURN). 해당 행이 없으면 null. */
export function a8Id(e: TimelineEvent): string | null {
  if (e.kind !== "transit") return null;
  if (e.milestone === "saturn_return") return "TR_SATURN_RETURN";
  if (e.milestone) return null; // 목성 리턴 등은 A18 전환점 문장에만 있다
  return `TR_${POINT_ID[e.transit]}_${POINT_ID[e.target]}_${aspectGroup(e.aspect)}`;
}

/**
 * A12 도입문은 '하늘 흐름과 맞을 때(intro_match)'와 '엇갈릴 때(intro_differ)' 두 판이 있다. DB에 고르는 규칙이 없어
 * Claude가 정한 규칙(owner 검토 가능): 2026년 상위 이벤트의 A8 톤(순풍/역풍)을 점수로 더해 하늘이 무거웠는지 본다.
 *  - 무거운 단어(버텨·고생·그만하자·멈춤·이별) + 무거운 하늘 → 맞음, 가벼운 단어(성취·설렘·시작·배움) + 가벼운 하늘 → 맞음
 *  - '변화'는 천왕성·명왕성·해왕성 이벤트나 별자리 이동(전환점)이 있으면 맞음
 */
export function q2Matches(word: Q2Word, top: ScoredEvent[], db: AstroDb, hasTurningPoint: boolean): boolean {
  if (word === "변화") {
    return hasTurningPoint || top.some((s) => s.event.kind === "transit" && ["uranus", "neptune", "pluto"].includes(s.event.transit));
  }
  let heavy = 0;
  for (const s of top) {
    const id = a8Id(s.event);
    const tone = id ? row(db, "A8", id)?.tone : null;
    if (tone === "역풍") heavy += s.score;
    else if (tone === "순풍") heavy -= s.score;
  }
  if (HEAVY_WORDS.has(word)) return heavy > 0;
  if (LIGHT_WORDS.has(word)) return heavy < 0;
  return true;
}

const TP_PLANET: Record<string, string> = { jupiter: "JUPITER", saturn: "SATURN", uranus: "URANUS", neptune: "NEPTUNE", pluto: "PLUTO" };

/** 전환점 이벤트 → A18 행 ID와 우선순위(개인 이벤트가 먼저). 맞는 행이 없으면 null. */
export function a18For(e: TimelineEvent, ascSign: string | null, birthYear: number): { id: string; personal: boolean } | null {
  if (e.kind === "transit" && e.milestone) {
    const year = Number((e.intervals[0].exact ?? e.intervals[0].from).slice(0, 4));
    switch (e.milestone) {
      case "saturn_return":
        return { id: year - birthYear < 45 ? "TP_SATURN_RETURN_1" : "TP_SATURN_RETURN_2", personal: true };
      case "jupiter_return":
        return { id: "TP_JUPITER_RETURN", personal: true };
      case "uranus_opposition":
        return { id: "TP_URANUS_OPPOSITION", personal: true };
      case "neptune_square":
        return { id: "TP_NEPTUNE_SQUARE", personal: true };
    }
  }
  if (e.kind === "eclipse" && e.contact?.aspect === "합") {
    return { id: e.eclipse === "solar" ? "TP_SOLAR_ECLIPSE_ON_POINT" : "TP_LUNAR_ECLIPSE_ON_POINT", personal: true };
  }
  if (e.kind === "ingress") {
    if (ascSign && e.sign === ascSign && (e.planet === "uranus" || e.planet === "saturn")) {
      return { id: `TP_${TP_PLANET[e.planet]}_INTO_ASC_SIGN`, personal: true };
    }
    const base = `TP_${TP_PLANET[e.planet]}_${SIGN_ID[e.sign]}`;
    return { id: `${base}_${e.house ? "H" : "C"}`, personal: false };
  }
  return null;
}

/**
 * 올해의 전환점 문단. 개인 이벤트(리턴·마일스톤·상승궁 별자리 진입·출생 행성 위 일식)를 먼저,
 * 공통 이벤트(별자리 이동)는 합쳐서 두 개가 될 때까지만 더한다(샘플의 '전환점 두 번' 결을 따름, 최대 3개).
 * 같은 행성이 같은 별자리에 역행으로 다시 들어오는 건 첫 번째만. 하나도 없으면 TP_QUIET_YEAR.
 */
export function turningPointTexts(db: AstroDb, events: TimelineEvent[], chart: NatalChart, birthYear: number): string[] {
  const w = { start: "2026-01-01", end: "2026-12-31" };
  const ascSign = chart.planets.asc?.sign ?? null;
  const seen = new Set<string>();
  const personal: Array<{ e: TimelineEvent; id: string }> = [];
  const common: Array<{ e: TimelineEvent; id: string }> = [];
  const candidates = [...turningPoints(events, w), ...events.filter((e) => e.kind === "eclipse" && clipIntervals(e.intervals, w).length)];
  for (const e of candidates) {
    const m = a18For(e, ascSign, birthYear);
    if (!m || !row(db, "A18", m.id)) continue;
    const key = e.kind === "ingress" ? `${e.planet}:${e.sign}` : m.id;
    if (seen.has(key)) continue;
    seen.add(key);
    (m.personal ? personal : common).push({ e, id: m.id });
  }
  const chosen = [...personal.slice(0, 3)];
  for (const c of common) if (chosen.length < Math.min(3, Math.max(2, personal.length))) chosen.push(c);
  chosen.sort((a, b) => ((a.e.intervals[0].exact ?? a.e.intervals[0].from) < (b.e.intervals[0].exact ?? b.e.intervals[0].from) ? -1 : 1));
  const lines = chosen
    .map(({ e, id }) => {
      const date = e.intervals[0].exact ?? e.intervals[0].from;
      const values: Record<string, string> = { 날짜: formatDate(date) };
      if (e.kind === "ingress") {
        values["별자리"] = e.sign;
        if (e.house) values["하우스영역"] = text(db, "A16", `TERM_H${pad2(e.house)}`, "nickname");
        values["행성"] = POINT_KO[e.planet];
      }
      if (e.kind === "eclipse" && e.contact) values["행성"] = POINT_KO[e.contact.target];
      return tryFill(text(db, "A18", id, "text"), values);
    })
    .filter((x): x is string => !!x);
  return lines.length ? lines : [text(db, "A18", "TP_QUIET_YEAR", "text")].filter(Boolean);
}

function reasonFor(db: AstroDb, s: ScoredEvent): { title: string; when: string; meaning: string } {
  const e = s.event;
  const id = a8Id(e);
  const a8 = id ? row(db, "A8", id) : null;
  const termId =
    e.kind === "retrograde" ? "TERM_RX" : e.kind === "ingress" ? "TERM_INGRESS" : e.kind === "eclipse" ? (e.eclipse === "solar" ? "TERM_SOLAR_ECLIPSE" : "TERM_LUNAR_ECLIPSE") : null;
  const meaning = a8?.meaning_line ?? (termId ? text(db, "A16", termId, "meaning_line") : "");
  const when = s.intervalsInWindow.length === 1 && s.intervalsInWindow[0].exact ? formatDate(s.intervalsInWindow[0].exact) : formatRanges(s.intervalsInWindow);
  return { title: a8?.title ?? eventLabel(e), when, meaning };
}

export function buildFreeResult(args: {
  db: AstroDb;
  chart: NatalChart;
  longitudes: Longitudes;
  character: CharacterResult;
  answers: Answers;
  nickname: string;
  birthYear: number;
  now?: Date;
}): FreeResult {
  const { db, chart, longitudes, character, answers, nickname, birthYear } = args;
  const today = new Date((args.now ?? new Date()).getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
  const nick = { 닉네임: nickname };
  const w = { start: "2026-01-01", end: "2026-12-31" };
  const events = buildTimeline(longitudes, w);

  // 2026 분기별 표: 분기마다 A8 문장이 있는 상위 이벤트 2개. 끝난 분기는 과거형(table_past), 지금·앞 분기는 table_future.
  const scored = scoreInWindow(events.filter((e) => periodFilter("year2026", e) || e.kind === "eclipse"), w, answers.q1);
  const quarters = groupRows(scored, w, "quarter").map((r) => {
    const past = r.window.end < today;
    const cells = r.events
      .map((s) => a8Id(s.event))
      .filter((id): id is string => !!id && !!row(db, "A8", id))
      .filter((id, i, arr) => arr.indexOf(id) === i)
      .slice(0, 2)
      .map((id) => text(db, "A8", id, past ? "table_past" : "table_future"));
    return {
      label: QUARTER_LABELS[r.index - 1],
      cell: cells.join(" ") || "—",
      reasons: r.events.slice(0, 3).map((s) => reasonFor(db, s)),
    };
  });

  const tps = turningPointTexts(db, events, chart, birthYear);
  const q2 = row(db, "A12", `Q2_${pad2(["버텨", "배움", "변화", "멈춤", "성취", "이별", "고생", "그만하자", "시작", "설렘"].indexOf(answers.q2) + 1)}`);
  const hasTp = turningPoints(events, w).length > 0;
  const match = q2Matches(answers.q2, scored.slice(0, 5), db, hasTp);

  const dominant = (Object.keys(STYLE_BY_ELEMENT) as Element[]).find((e) => STYLE_BY_ELEMENT[e] === character.style)!;
  const sunSign = chart.planets.sun!.sign;
  const moonSign = chart.planets.moon!.sign;
  const temp = row(db, "A17b", `TEMP_${ELEMENT_ID[elementOf(longitudes.sun)]}_${ELEMENT_ID[elementOf(longitudes.moon)]}`);
  const charRow = db.dbs.A5.rows.find((r) => r.character === character.name)!;

  const planets: FreeResult["wheelSheets"]["planets"] = {};
  for (const k of Object.keys(chart.planets) as PointKey[]) {
    const sh = planetSheet(db, k, chart);
    if (sh) planets[k] = sh;
  }

  const soft = isSoftTone(answers.q2);
  return {
    dbVersion: db.version,
    dbDraft: db.status.startsWith("DRAFT"),
    terms: (["SUN", "MOON", "ASC"] as const)
      .filter((k) => k !== "ASC" || chart.planets.asc)
      .map((k) => ({ name: text(db, "A16", `TERM_${k}`, "name"), line: text(db, "A16", `TERM_${k}`, "meaning_line") })),
    accuracy: chart.accuracy,
    gradeNote: text(db, "A15", `FIX_GRADE_${chart.accuracy}`, "text"),
    addTimeNote: chart.accuracy === "A" ? null : text(db, "A15", "FIX_ADD_TIME", "text").replace(/\s*→\s*\[.*\]\s*$/, ""),
    chart,
    elements: elementTexts(db, chart.elements, dominant),
    wheelSheets: { planets, signs: signSheets(db), lines: lineSheets(db, chart) },
    wheelTips: [1, 2, 3].map((i) => text(db, "A15", `FIX_WHEEL_TIP_${i}`, "text")).filter(Boolean),
    character: {
      name: SHOW_CHARACTER ? character.name : null,
      typeLine: charRow.type_line,
      competency: character.competency,
      style: character.style,
      why: charRow.why_text,
      intro: SHOW_CHARACTER ? charRow.intro : null,
      strength: SHOW_CHARACTER ? charRow.strength : null,
      energyMoment: SHOW_CHARACTER ? charRow.energy_moment : null,
      careTip: SHOW_CHARACTER ? charRow.care_tip : null,
      sunMoonLine: tryFill(temp?.sun_moon_line, { 태양별자리: sunSign, 달별자리: moonSign }),
      competencyLine: a6Line(db, "역량", character.competency),
      styleLine: a6Line(db, "방식", character.style),
    },
    big3: (["sun", "moon", "asc"] as const)
      .filter((k) => chart.planets[k])
      .map((k) => ({
        key: k,
        label: BIG3_LABEL[k],
        sign: chart.planets[k]!.sign,
        house: chart.planets[k]!.house ?? null,
        line: text(db, k === "sun" ? "A2" : k === "moon" ? "A3" : "A4", `${POINT_ID[k]}_${SIGN_ID[chart.planets[k]!.sign]}`, "table_line"),
      })),
    sunSign,
    sunSignIndex: SIGNS.indexOf(sunSign as (typeof SIGNS)[number]),
    softTone: soft,
    year2026: {
      intro: tryFill(q2?.[match ? "intro_match" : "intro_differ"], nick) ?? "",
      turningPoints: tps.map((t) => tryFill(t, nick)).filter((x): x is string => !!x),
      quarters,
      closing: tryFill(q2?.closing, nick) ?? "",
    },
    care: soft
      ? { note: q2?.care_note ?? "", card: text(db, "A15", "FIX_CARE_CARD", "text").replace(/\s*→\s*\[.*\]\s*$/, "") }
      : null,
    paywallBox: text(db, "A15", "FIX_PAYWALL_BOX", "text").replace(/\s*→\s*\[.*\]\s*$/, ""),
    disclaimer: text(db, "A15", "FIX_DISCLAIMER", "text"),
    paidSections: PAID_SECTION_TITLES,
  };
}

/** 후보 선택 화면(B6 카드 + A15 안내). */
export function candidateCards(db: AstroDb, names: string[]): { intro: string; cards: Record<string, string>; labels: Record<string, string> } {
  const cards: Record<string, string> = {};
  const labels: Record<string, string> = {};
  for (const n of names) {
    cards[n] = db.dbs.B6.rows.find((r) => r.character === n)?.choice_line ?? "";
    labels[n] = characterLabel(db, n);
  }
  return { intro: text(db, "A15", "FIX_CANDIDATE_CHOICE", "text"), cards, labels };
}

/** 역량 동점 확인 화면(A15 FIX_TIE_CHOICE + 두 유형의 B6 카드). 동물 이름은 보내지 않는다(SHOW_CHARACTER). */
export function tieOptions(db: AstroDb, c: CharacterResult): { intro: string; options: Array<{ competency: string; style: string; label: string; card: string }> } {
  const opts = [c.competency, c.runner_up].map((comp) => {
    const name = CHARACTER_GRID[comp][STYLES.indexOf(c.style)];
    return {
      competency: comp,
      style: c.style,
      label: characterLabel(db, name),
      card: db.dbs.B6.rows.find((r) => r.character === name)?.choice_line ?? "",
    };
  });
  return { intro: text(db, "A15", "FIX_TIE_CHOICE", "text"), options: opts };
}
