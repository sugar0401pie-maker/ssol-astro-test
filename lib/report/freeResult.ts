// 무료 구간(1~3번 섹션) 화면 데이터 조립 — AI 호출 0회(마스터스펙 6-2), 문장은 전부 해석 DB(A1~A18, B1·B2·B6)에서.
// 유료 섹션(4~7)은 제목만 보낸다 — 본문을 브라우저에 보내고 블러로 가리면 결제 없이 볼 수 있기 때문.
// 출생차트의 모든 행성·하우스·각도 설명은 무료(2026-10-09 결정): 휠 탭 시트 전체 + 본문 '나의 행성 읽기'·'행성끼리의 관계'.
// DB 문장의 토큰을 못 채우면 그 문장은 빼고 보여준다(fail safe) — 빈칸·괄호가 화면에 나가지 않게.
import { DOMAIN_MAP, isSoftTone, type Answers, type Q2Word } from "../astro/answers.ts";
import type { CharacterResult } from "../astro/character.ts";
import { SHOW_CHARACTER, characterLabel } from "./characterDisplay.ts";
import { CHARACTER_GRID, PLANET_KEYS, SIGNS, STYLES, STYLE_BY_ELEMENT, elementOf, type Element, type PointKey } from "../astro/constants.ts";
import type { Accuracy, Longitudes, NatalChart } from "../astro/natal.ts";
import {
  buildTimeline, periodFilter, scoreInWindow, turningPoints, type ScoredEvent, type TimelineEvent,
} from "../astro/timeline.ts";
import { POINT_ID, SIGN_ID, ELEMENT_ID, aspectGroup, findRow, pad2, row, tryFill, type AstroDb } from "./db.ts";
import { formatDate, QUARTER_LABELS } from "./format.ts";
import { a12Variant, b11, fillSummary, hashPick } from "./variants.ts";
import { pickTheme, themeScores, themeTable } from "./theme2026.ts";
import { POINT_KO } from "./labels.ts";

export const PAID_SECTION_TITLES = [
  { no: 4, title: "연말까지 조심하면 좋을 것" },
  { no: 5, title: "2027년을 맞는 마음가짐" },
  { no: 6, title: "앞으로 5년, {닉네임}님의 삶은 이렇게 흘러갈 거예요" },
  { no: 7, title: "별이 주는 질문과 웰니스 제안" },
] as const;

/** 휠 탭 시트(프로토타입 planetSheet·signSheet·aspectSheet 그대로): 제목 + 작은 글씨 kicker + 문단(굵은 앞말 b가 있을 수 있음) */
export interface WheelSheet {
  title: string;
  /** 별자리 시트 제목 앞 기호 */
  glyph?: string;
  kicker: string;
  paras: Array<{ b?: string; t: string }>;
  /** 작은 회색 줄(예: "이 칸에 있는 행성: …") */
  muted?: string;
}

/** 휠 각도 선(프로토타입 topAspects: 합 제외, 행성끼리, 점수순 — 앞 8개만 처음에 보임) */
export interface WheelAspect {
  a: PointKey;
  b: PointKey;
  aspect: string;
  orb: number;
  harm: boolean;
  /** '표로 보기' 각도 표의 뜻(B3 line_meaning) */
  meaning: string;
}

export interface FreeResult {
  dbVersion: string;
  /** DB 상태가 DRAFT(상담사 검수 전)면 화면에 작게 표시 — 검수가 끝나 상태가 바뀌면 자동으로 사라진다. */
  dbDraft: boolean;
  /** 점성술이 처음인 사람에게 태양·달·상승궁 용어 한 줄 설명(A16, 마스터스펙 6-1 기타) */
  terms: Array<{ name: string; line: string }>;
  accuracy: Accuracy;
  /** 결과 머리(프로토타입 res-head): "1996.04.01 10:17 · 경기" */
  header: { title: string; line: string };
  /** 출생 순간 역행 중인 행성 */
  retro: PointKey[];
  /** '표로 보기' 각주의 계산 시각 "UTC 1996-04-01 01:17" */
  utcLabel: string;
  /** 휠 각도 선(점수순) — 시트 키는 순서 번호 */
  wheelAspects: WheelAspect[];
  /** A등급 역량 동점: 2번 섹션 "요즘의 나와 더 가까운 건?" 두 카드(프로토타입 renderType). 아니면 null */
  tie: { options: Array<{ competency: string; style: string; card: string; selected: boolean }> } | null;
  gradeNote: string;
  /** B·C등급: "태어난 시간을 알면 더 정확해져요" 안내(A15 FIX_ADD_TIME) */
  addTimeNote: string | null;
  chart: NatalChart;
  /** 4원소(프로토타입 renderSky): 가장 강한 원소(점 표시) + A7 문장(강할 때 1개 + 1점 이하인 원소의 부족할 때) */
  elements: { strongest: Element; texts: string[] };
  /** 휠 탭 시트. lines 키는 wheelAspects 순서 번호 */
  wheelSheets: { planets: Partial<Record<PointKey, WheelSheet>>; signs: Record<string, WheelSheet>; lines: Record<string, WheelSheet> };
  /** 처음인 사용자의 휠 3단계 안내 말풍선(A15 FIX_WHEEL_TIP_1~3) */
  wheelTips: string[];
  /** 섹션 1 '나의 행성 읽기'(수성~명왕성, B1a·B1b + B2a·B2b)와 '행성끼리의 관계'(주요 각도 3개, B3) — 무료 */
  planetReading: {
    head: string;
    planets: Array<{ key: PointKey; title: string; shortLine: string; text: string; houseLine: string | null }>;
    aspectsHead: string;
    aspects: Array<{ title: string; sub: string; lineMeaning: string; text: string }>;
  };
  character: {
    /** 굵은 한 줄 요약(B11 SUM_TYPE) */
    summary: string | null;
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
    /** 굵은 한 줄 요약(B11 SUM_2026) */
    summary: string | null;
    /** 분기 표 소제목(B11 HEAD_2026_Q) */
    quarterHead: string;
    intro: string;
    /** A12d(단어 × 고민 영역) — 전환점 뒤 */
    areaLine: string;
    /** 2026 하늘 주제(A12t) */
    theme: string;
    turningPoints: string[];
    quarters: Array<{ label: string; cell: string; reasons: Array<{ title: string; when: string; meaning: string }> }>;
    closing: string;
  };
  /** 부드러운 톤(Q2 그만하자·이별·고생)일 때 결과 하단 카드 */
  care: { note: string; card: string } | null;
  paywallBox: string;
  /** 결제 팝업 문구(B11 PAY_POPUP, "안내 · 덧붙임 · [버튼]") */
  payPopup: string;
  /** 저장·로그인 화면 문구(B11 SAVE_DONE·LOGIN_BIG·LOGIN_SMALL·LOGIN_DONE) */
  saveCopy: { saveDone: string; loginBig: string; loginSmall: string; loginDone: string };
  /** 임시 계정(로그인 안 함) 결제 안내(B11, 2026-10-10): 결제 팝업 아래 작은 글씨 · 결제 직후 리포트 위 배너 · 그때의 가입 화면 제목 */
  tempPay: { note: string; banner: string; loginBigPaid: string };
  disclaimer: string;
  paidSections: typeof PAID_SECTION_TITLES;
}

const text = (db: AstroDb, table: string, id: string, col: string) => row(db, table, id)?.[col] ?? "";

const BIG3_LABEL = { sun: "태양 (삶의 중심)", moon: "달 (감정의 욕구)", asc: "상승궁 (첫인상)" } as const;

// ---- 4원소 ----

const ELEM_ORDER: readonly Element[] = ["불", "흙", "공기", "물"];

/**
 * 4원소 문장(프로토타입 renderSky 그대로): 가장 강한 원소 = 캐릭터 방식을 정한 원소가 최고점이면 그것, 아니면 불·흙·공기·물 순 첫 최고점.
 * A7 '강할 때' 1개 + 점수가 1점 이하인 원소마다 '부족할 때'.
 */
export function elementTexts(db: AstroDb, elements: Record<Element, number>, dominant: Element): FreeResult["elements"] {
  const max = Math.max(...ELEM_ORDER.map((e) => elements[e]));
  const strongest = elements[dominant] === max ? dominant : ELEM_ORDER.find((e) => elements[e] === max)!;
  const texts = [text(db, "A7", `ELEM_${ELEMENT_ID[strongest]}_STRONG`, "text")];
  for (const e of ELEM_ORDER) if (elements[e] <= 1) texts.push(text(db, "A7", `ELEM_${ELEMENT_ID[e]}_WEAK`, "text"));
  return { strongest, texts: texts.filter(Boolean) };
}

// ---- 휠 탭 시트 ----

function planetSheet(db: AstroDb, key: PointKey, chart: NatalChart, retro: readonly PointKey[]): WheelSheet | null {
  const p = chart.planets[key];
  if (!p) return null;
  const sid = SIGN_ID[p.sign];
  const term = row(db, "A16", `TERM_${POINT_ID[key]}`);
  const deg = `${p.sign} ${p.deg.toFixed(1)}°`;
  if (key === "asc") {
    return { title: `상승궁 · ${p.sign} · 1하우스`, kicker: `${deg} — ${term ? `${term.nickname}: ${term.meaning_line}` : ""}`, paras: [{ t: text(db, "A4", `ASC_${sid}`, "text") }].filter((x) => x.t) };
  }
  if (key === "mc") {
    return { title: `천정 · ${p.sign} · ${p.house}하우스`, kicker: deg, paras: term ? [{ t: `${term.meaning_line} ${term.detail}` }] : [] };
  }
  const title = `${POINT_KO[key]} · ${p.sign}${p.house ? ` · ${p.house}하우스` : ""}`;
  const kicker = `${deg}${retro.includes(key) ? " · 역행" : ""}${term ? ` — ${term.nickname}: ${term.meaning_line}` : ""}`;
  const paras: WheelSheet["paras"] = [];
  if (key === "sun" || key === "moon") {
    const t = text(db, key === "sun" ? "A2" : "A3", `${POINT_ID[key]}_${sid}`, "text");
    if (t) paras.push({ t });
    const b2 = p.house ? row(db, "B2a", `HS_${POINT_ID[key]}_H${pad2(p.house)}`) : null;
    if (b2) paras.push({ t: `${b2.short_line} ${b2.text}` });
    return { title, kicker, paras };
  }
  const outer = key === "uranus" || key === "neptune" || key === "pluto";
  const b1 = row(db, outer ? "B1b" : "B1a", `PL_${POINT_ID[key]}_${sid}`);
  if (b1) paras.push({ b: b1.short_line, t: b1.text });
  const b2 = p.house ? row(db, key === "mercury" || key === "venus" || key === "mars" ? "B2a" : "B2b", `HS_${POINT_ID[key]}_H${pad2(p.house)}`) : null;
  if (b2) paras.push({ b: `${p.house}하우스`, t: `· ${b2.short_line} ${b2.text}` });
  return { title, kicker, paras };
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
const GROUP_KO: Record<string, string> = { CONJ: "합", HARM: "조화", TENSE: "긴장" };
const b3For = (db: AstroDb, a: PointKey, b: PointKey, aspect: string) => {
  const g = aspectGroup(aspect);
  return row(db, "B3", `ASP_${POINT_ID[a]}_${POINT_ID[b]}_${g}`) ?? row(db, "B3", `ASP_${POINT_ID[b]}_${POINT_ID[a]}_${g}`);
};

/** 휠 각도 선(프로토타입 topAspects): 합은 빼고, 행성끼리만, (무게 합) × 각도 무게 × (1 − 오브/6) 점수순 */
export function wheelAspects(db: AstroDb, chart: NatalChart): WheelAspect[] {
  return chart.aspects
    .filter((a) => a.aspect !== "합" && READING_WEIGHT[a.a] && READING_WEIGHT[a.b])
    .map((a) => ({ a, sc: (READING_WEIGHT[a.a]! + READING_WEIGHT[a.b]!) * READING_ASPECT_W[a.aspect] * (1 - a.orb / 6) }))
    .sort((x, y) => y.sc - x.sc)
    .map(({ a }) => ({ a: a.a, b: a.b, aspect: a.aspect, orb: a.orb, harm: a.aspect === "삼분" || a.aspect === "육분", meaning: b3For(db, a.a, a.b, a.aspect)?.line_meaning ?? "" }));
}

/** 각도 선 탭 시트(프로토타입 aspectSheet): B3 제목, kicker(두 행성 별자리·각도·오차 — 각도 별명), B3 두 줄 / 없으면 A16 각도 뜻 */
function lineSheets(db: AstroDb, chart: NatalChart, list: WheelAspect[]): Record<string, WheelSheet> {
  const out: Record<string, WheelSheet> = {};
  list.forEach((a, i) => {
    const r = b3For(db, a.a, a.b, a.aspect);
    const ta = row(db, "A16", ASPECT_TERM[a.aspect]);
    const kicker = `${POINT_KO[a.a]} ${chart.planets[a.a]?.sign} · ${POINT_KO[a.b]} ${chart.planets[a.b]?.sign} · ${a.aspect} (오차 ${a.orb.toFixed(1)}°)${ta ? ` — ${ta.nickname}` : ""}`;
    out[String(i)] = {
      title: r ? r.title : `${POINT_KO[a.a]}-${POINT_KO[a.b]} ${GROUP_KO[aspectGroup(a.aspect)]}`,
      kicker,
      paras: r ? [{ t: r.line_meaning }, { t: r.text }] : ta ? [{ t: ta.meaning_line }] : [],
    };
  });
  return out;
}

const READING_PLANETS = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] as const;
// 주요 각도 고르기(프로토타입 planetReading과 같은 규칙): (행성 무게 합) × 각도 무게 × (1 − 오브/6), B3 행이 있는 것만 3개.
const READING_WEIGHT: Partial<Record<PointKey, number>> = { sun: 3, moon: 3, mercury: 2, venus: 2, mars: 2, jupiter: 1.5, saturn: 1.5, uranus: 1, neptune: 1, pluto: 1 };
const READING_ASPECT_W: Record<string, number> = { 합: 1, 충: 0.9, 사각: 0.9, 삼분: 0.7, 육분: 0.5 };

/** 섹션 1 '나의 행성 읽기'·'행성끼리의 관계'(2026-10-09, 마스터스펙 6-1-1). 하우스 문장은 A·B등급만. */
export function planetReading(db: AstroDb, chart: NatalChart): FreeResult["planetReading"] {
  const planets = READING_PLANETS.flatMap((k) => {
    const p = chart.planets[k];
    if (!p) return [];
    const sid = SIGN_ID[p.sign];
    const outer = k === "uranus" || k === "neptune" || k === "pluto";
    const b1 = row(db, outer ? "B1b" : "B1a", `PL_${POINT_ID[k]}_${sid}`);
    const b2 = p.house ? row(db, k === "mercury" || k === "venus" || k === "mars" ? "B2a" : "B2b", `HS_${POINT_ID[k]}_H${pad2(p.house)}`) : null;
    return [{
      key: k as PointKey,
      title: `${POINT_KO[k]} · ${p.sign}${p.house ? ` · ${p.house}하우스` : ""}`,
      shortLine: b1?.short_line ?? "",
      text: b1?.text ?? "",
      houseLine: b2 ? `${p.house}하우스 · ${b2.short_line}` : null,
    }];
  });
  const group = (a: string) => (a === "합" ? "CONJ" : a === "삼분" || a === "육분" ? "HARM" : "TENSE");
  const aspects = chart.aspects
    .filter((a) => READING_WEIGHT[a.a] && READING_WEIGHT[a.b])
    .map((a) => ({ a, sc: (READING_WEIGHT[a.a]! + READING_WEIGHT[a.b]!) * READING_ASPECT_W[a.aspect] * (1 - a.orb / 6) }))
    .sort((x, y) => y.sc - x.sc)
    .flatMap(({ a }) => {
      const g = group(a.aspect);
      const r = row(db, "B3", `ASP_${POINT_ID[a.a]}_${POINT_ID[a.b]}_${g}`) ?? row(db, "B3", `ASP_${POINT_ID[a.b]}_${POINT_ID[a.a]}_${g}`);
      return r ? [{ title: r.title, sub: `${a.aspect} · 오차 ${a.orb.toFixed(1)}°`, lineMeaning: r.line_meaning, text: r.text }] : [];
    })
    .slice(0, 3);
  return { head: b11(db, "HEAD_PLANETS"), planets, aspectsHead: b11(db, "HEAD_ASPECTS"), aspects };
}

/** 별자리 칸 탭 시트(프로토타입 signSheet): 기호+이름, kicker(기간·원소·양태·수호성·키워드), 한 줄·용어, (시간 앎) 하우스 뜻, 이 칸의 행성 */
function signSheets(db: AstroDb, chart: NatalChart): Record<string, WheelSheet> {
  const out: Record<string, WheelSheet> = {};
  const asc = chart.planets.asc;
  SIGNS.forEach((sign, i) => {
    const r = row(db, "A1", `SIGN_${SIGN_ID[sign]}`);
    if (!r) return;
    const paras: WheelSheet["paras"] = [{ t: r.one_liner }, { t: r.term_note }].filter((x) => x.t);
    if (asc) {
      const hn = (((i - SIGNS.indexOf(asc.sign)) % 12) + 12) % 12 + 1;
      const t = row(db, "A16", `TERM_H${pad2(hn)}`);
      if (t) paras.push({ b: `${hn}하우스 · ${t.nickname}`, t: `— ${t.meaning_line}` });
    }
    const inside = PLANET_KEYS.filter((k) => chart.planets[k]?.sign === sign).map((k) => POINT_KO[k]);
    out[sign] = {
      title: r.sign,
      glyph: r.symbol,
      kicker: `${r.dates} · ${r.element} · ${r.modality} · 수호성 ${r.ruler} · ${r.keywords}`,
      paras,
      muted: inside.length ? `이 칸에 있는 행성: ${inside.join(", ")}` : undefined,
    };
  });
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
  if (e.kind === "chiron_return") return { id: "TP_CHIRON_RETURN", personal: true };
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

/** 프로토타입(render2026)의 별자리 이동 전환점: 이 넷만, 우선순위 기본값 */
const TP_INGRESS: Record<string, [string, number]> = {
  "uranus|쌍둥이자리": ["URANUS_GEMINI", 60],
  "saturn|양자리": ["SATURN_ARIES", 55],
  "neptune|양자리": ["NEPTUNE_ARIES", 40],
  "jupiter|사자자리": ["JUPITER_LEO", 45],
};

/**
 * 올해의 전환점 문단(2026-10-09 프로토타입 render2026 그대로): 토성 리턴(100, 45세 전후로 1·2), 키론 리턴(95),
 * 상승궁 별자리로 들어오는 천왕성·토성(90), 그 밖의 네 가지 별자리 이동(기본값 + 고민 영역 하우스면 +30).
 * 우선순위 상위 2개 + 나머지 중 70 이상 1개, 날짜순. 하나도 없으면 TP_QUIET_YEAR.
 * 프로토타입에 없는 나이 마일스톤(목성 리턴 80·천왕성 충 85·해왕성 사각 85)도 A18 행이 있어 같은 규칙에 넣었다
 * (마스터스펙 6-2 '나이 마일스톤 포함' — Claude 판단, owner 검토 가능).
 */
export function turningPointTexts(db: AstroDb, events: TimelineEvent[], chart: NatalChart, birthYear: number, opts: { birthDate?: string; domainHouses?: number[] } = {}): string[] {
  const ascSign = chart.planets.asc?.sign ?? null;
  const timed = !!ascSign;
  const houseArea = (h: number) => `${text(db, "A16", `TERM_H${pad2(h)}`, "nickname")}(${h}하우스)`;
  const ageAt = (date: string) => {
    if (!opts.birthDate) return Number(date.slice(0, 4)) - birthYear;
    const [by, bm, bd] = opts.birthDate.split("-").map(Number);
    const [y, m, d] = date.split("-").map(Number);
    return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
  };
  const tps: Array<{ pri: number; date: string; text: string | null }> = [];
  const in2026 = (d?: string) => !!d && d.startsWith("2026") && d !== "2026-01-01";
  for (const e of events) {
    if (e.kind === "transit" && e.milestone) {
      const date = e.intervals.find((iv) => in2026(iv.exact))?.exact;
      if (!date) continue;
      const m = e.milestone;
      const [id, pri] =
        m === "saturn_return" ? [ageAt(date) < 45 ? "TP_SATURN_RETURN_1" : "TP_SATURN_RETURN_2", 100] : m === "jupiter_return" ? ["TP_JUPITER_RETURN", 80] : m === "uranus_opposition" ? ["TP_URANUS_OPPOSITION", 85] : ["TP_NEPTUNE_SQUARE", 85];
      tps.push({ pri: pri as number, date, text: tryFill(text(db, "A18", id as string, "text"), { 날짜: formatDate(date) }) });
    } else if (e.kind === "chiron_return") {
      const date = e.intervals.find((iv) => iv.exact?.startsWith("2026"))?.exact;
      if (date) tps.push({ pri: 95, date, text: tryFill(text(db, "A18", "TP_CHIRON_RETURN", "text"), { 날짜: formatDate(date) }) });
    }
  }
  const seen = new Set<string>();
  for (const e of events
    .filter((x): x is Extract<TimelineEvent, { kind: "ingress" }> => x.kind === "ingress" && x.intervals[0].from.startsWith("2026"))
    .sort((a, b) => (a.intervals[0].from < b.intervals[0].from ? -1 : 1))) {
    const key = `${e.planet}|${e.sign}`;
    if (!TP_INGRESS[key] || seen.has(key)) continue;
    seen.add(key);
    const date = e.intervals[0].from;
    let id: string;
    let pri: number;
    if (timed && (e.planet === "uranus" || e.planet === "saturn") && e.sign === ascSign) {
      id = `TP_${e.planet === "uranus" ? "URANUS" : "SATURN"}_INTO_ASC_SIGN`;
      pri = 90;
    } else {
      id = `TP_${TP_INGRESS[key][0]}_${timed ? "H" : "C"}`;
      pri = TP_INGRESS[key][1] + (timed && e.house && (opts.domainHouses ?? []).includes(e.house) ? 30 : 0);
    }
    tps.push({ pri, date, text: tryFill(text(db, "A18", id, "text"), { 날짜: formatDate(date), 별자리: e.sign, 하우스영역: e.house ? houseArea(e.house) : "", 행성: POINT_KO[e.planet] }) });
  }
  const ok = tps.filter((t) => t.text).sort((a, b) => b.pri - a.pri);
  const pick = [...ok.slice(0, 2), ...ok.slice(2).filter((t) => t.pri >= 70).slice(0, 1)].sort((a, b) => (a.date < b.date ? -1 : 1));
  return pick.length ? pick.map((t) => t.text!) : [text(db, "A18", "TP_QUIET_YEAR", "text")].filter(Boolean);
}


export function buildFreeResult(args: {
  db: AstroDb;
  chart: NatalChart;
  longitudes: Longitudes;
  character: CharacterResult;
  answers: Answers;
  nickname: string;
  birthYear: number;
  /** 표현 변형을 고르는 출생정보 해시 열쇠(variants.ts birthKeyOf). 없으면 원래 문장(A12 1번)만 */
  birthKey?: string;
  /** 현지 출생일 'YYYY-MM-DD' — 키론 리턴(2026 전환점) 계산용. 없으면 키론은 빠진다 */
  birthDate?: string;
  /** 결과 머리 줄(프로토타입 res-head, 예: "1996.04.01 10:17 · 경기") */
  birthLine?: string;
  /** 출생 순간 역행 중인 행성(natal.ts retrogradeAt) */
  retro?: PointKey[];
  /** 출생 시각 UTC(ISO) — '표로 보기' 각주 */
  utc?: string;
  /** 정확한 시각이 서머타임 경계(없는/두 번 있는 시각)면 정확도 B로 표시(17_해외도시 ③) */
  dstBoundary?: "gap" | "ambiguous";
  now?: Date;
}): FreeResult {
  const { db, chart, longitudes, character, answers, nickname, birthYear } = args;
  const today = new Date((args.now ?? new Date()).getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
  const nick = { 닉네임: nickname };
  const w = { start: "2026-01-01", end: "2026-12-31" };
  const events = buildTimeline(longitudes, w, undefined, { birthDate: args.birthDate });

  // 2026 분기별 표(프로토타입 render2026): 1~3분기는 그 분기에 정확한 날이 있는 느린 행성 트랜짓 중 점수 1위의 A8 table_past
  // (없으면 A11 SKY_05), 4분기는 지금 지나고 있는 분기라 '연말까지' 섹션으로 잇는 문장. 접힌 근거는 1~3분기: 상위 4개 + 그 분기 별자리 이동.
  const scored = scoreInWindow(events.filter((e) => periodFilter("year2026", e) || e.kind === "eclipse"), w, answers.q1);
  const slowScored = scoreInWindow(
    events.filter((e) => e.kind === "transit" && ["jupiter", "saturn", "uranus", "neptune", "pluto"].includes(e.transit) && (e.milestone === null || e.milestone === "saturn_return")),
    w,
    answers.q1,
  );
  const exactOf = (s: ScoredEvent) => s.event.intervals.find((iv) => iv.exact && iv.exact.startsWith("2026") && iv.exact !== "2026-01-01")?.exact ?? null;
  const qOf = (d: string) => Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1;
  const quarters = [1, 2, 3, 4].map((qn) => {
    const qEnd = ["2026-03-31", "2026-06-30", "2026-09-30", "2026-12-31"][qn - 1];
    const list = slowScored.filter((s) => {
      const d = exactOf(s);
      return d && qOf(d) === qn;
    });
    if (qn === 4 && today <= qEnd) {
      return { label: QUARTER_LABELS[3], cell: "지금 지나고 있는 시기예요. 아래 ‘연말까지 조심하면 좋을 것’에서 이어집니다.", reasons: [] };
    }
    const top = list[0];
    const id = top ? a8Id(top.event) : null;
    const cell = (id && text(db, "A8", id, "table_past")) || text(db, "A11", "SKY_05", "common_line") || "—";
    const reasons = list.slice(0, 4).map((s) => {
      const d = exactOf(s)!;
      const e = s.event as Extract<TimelineEvent, { kind: "transit" }>;
      const a8 = a8Id(e) ? row(db, "A8", a8Id(e)!) : null;
      return { iso: d, title: e.milestone === "saturn_return" ? "토성 리턴" : `${POINT_KO[e.transit]}-${POINT_KO[e.target]} ${e.aspect}`, when: formatDate(d), meaning: a8?.meaning_line ?? "" };
    });
    for (const e of events) {
      if (e.kind !== "ingress" || !e.intervals[0].from.startsWith("2026") || qOf(e.intervals[0].from) !== qn) continue;
      const d = e.intervals[0].from;
      reasons.push({ iso: d, title: `${POINT_KO[e.planet]} ${e.sign}${e.house ? `(${e.house}하우스)` : ""} 이동`, when: formatDate(d), meaning: text(db, "A16", "TERM_INGRESS", "meaning_line") });
    }
    reasons.sort((a, b) => (a.iso < b.iso ? -1 : 1));
    return { label: QUARTER_LABELS[qn - 1], cell, reasons: reasons.map(({ title, when, meaning }) => ({ title, when, meaning })) };
  });

  const tps = turningPointTexts(db, events, chart, birthYear, { birthDate: args.birthDate, domainHouses: DOMAIN_MAP[answers.q1].houses });
  const q2 = row(db, "A12", `Q2_${pad2(["버텨", "배움", "변화", "멈춤", "성취", "이별", "고생", "그만하자", "시작", "설렘"].indexOf(answers.q2) + 1)}`);
  const hasTp = turningPoints(events, w).length > 0;
  const match = q2Matches(answers.q2, scored.slice(0, 5), db, hasTp);
  // 해석 DB v1.3: 2026 하늘 주제(A12t 규칙) → 첫 문단 A12c(단어 × 주제), 전환점 뒤에 A12d(단어 × 고민 영역). 칸 안 표현은 출생정보 해시로 하나.
  const themes = themeTable(db);
  const picked = pickTheme(themeScores(events, longitudes), answers.q2, themes);
  const pick3 = (table: "A12c" | "A12d", match: (r: Record<string, string>) => boolean, salt: string) => {
    const rows = (db.dbs[table]?.rows ?? []).filter(match).sort((a, b) => Number(a.variant) - Number(b.variant));
    if (!rows.length) return null;
    return rows[args.birthKey ? hashPick(args.birthKey, rows.length, salt) : 0].text;
  };
  const themeIntro = pick3("A12c", (r) => r.word === answers.q2 && r.theme === themes[picked.theme]?.name, `A12c${answers.q2}${picked.theme}`);
  const areaLine = pick3("A12d", (r) => r.word === answers.q2 && r.area === answers.q1, `A12d${answers.q2}${answers.q1}`);

  const dominant = (Object.keys(STYLE_BY_ELEMENT) as Element[]).find((e) => STYLE_BY_ELEMENT[e] === character.style)!;
  const sunSign = chart.planets.sun!.sign;
  const moonSign = chart.planets.moon!.sign;
  const temp = row(db, "A17b", `TEMP_${ELEMENT_ID[elementOf(longitudes.sun)]}_${ELEMENT_ID[elementOf(longitudes.moon)]}`);
  const charRow = db.dbs.A5.rows.find((r) => r.character === character.name)!;

  const retro = args.retro ?? [];
  const planets: FreeResult["wheelSheets"]["planets"] = {};
  for (const k of Object.keys(chart.planets) as PointKey[]) {
    const sh = planetSheet(db, k, chart, retro);
    if (sh) planets[k] = sh;
  }
  const wAspects = wheelAspects(db, chart);
  // A등급 역량 동점: 계산상 1위가 먼저, 지금 고른 쪽이 눌린 상태(프로토타입 renderType)
  const tiePair = character.needs_confirm ? [character.competency, character.runner_up].sort((a, b) => character.percentiles[a] - character.percentiles[b]) : [];

  const soft = isSoftTone(answers.q2);
  return {
    dbVersion: db.version,
    dbDraft: db.status.startsWith("DRAFT"),
    terms: (["SUN", "MOON", "ASC"] as const)
      .filter((k) => k !== "ASC" || chart.planets.asc)
      .map((k) => ({ name: text(db, "A16", `TERM_${k}`, "name"), line: text(db, "A16", `TERM_${k}`, "meaning_line") })),
    accuracy: args.dstBoundary && chart.accuracy === "A" ? "B" : chart.accuracy,
    header: { title: `${nickname}님의 별 리포트`, line: args.birthLine ?? "" },
    retro,
    utcLabel: args.utc ? `UTC ${args.utc.slice(0, 16).replace("T", " ")}` : "",
    wheelAspects: wAspects,
    tie:
      chart.accuracy === "A" && tiePair.length === 2
        ? {
            options: tiePair.map((comp) => {
              const name = CHARACTER_GRID[comp][STYLES.indexOf(character.style)];
              return { competency: comp, style: character.style, card: db.dbs.B6.rows.find((r) => r.character === name)?.choice_line ?? "", selected: comp === character.competency };
            }),
          }
        : null,
    gradeNote:
      args.dstBoundary && chart.accuracy === "A"
        ? // 서머타임 경계: 계산은 입력한 시각 그대로(첫 번째 해석) 하되 1시간 안의 차이를 알린다 — 안내 문장은 Claude 초안(owner 검토 가능)
          `${args.dstBoundary === "gap" ? "태어난 시각이 서머타임으로 시계를 건너뛴 시간에 있어, 건너뛴 만큼 뒤로 옮겨 계산했어요." : "태어난 시각이 서머타임이 끝나며 두 번 있었던 시간이라, 첫 번째(서머타임 쪽)로 계산했어요."} 1시간 안의 차이로 상승궁·하우스가 바뀔 수 있어요.`
        : text(db, "A15", `FIX_GRADE_${chart.accuracy}`, "text"),
    addTimeNote: chart.accuracy === "A" ? null : text(db, "A15", "FIX_ADD_TIME", "text").replace(/\s*→\s*\[.*\]\s*$/, ""),
    chart,
    elements: elementTexts(db, chart.elements, dominant),
    wheelSheets: { planets, signs: signSheets(db, chart), lines: lineSheets(db, chart, wAspects) },
    wheelTips: [1, 2, 3].map((i) => text(db, "A15", `FIX_WHEEL_TIP_${i}`, "text")).filter(Boolean),
    planetReading: planetReading(db, chart),
    character: {
      summary: fillSummary(b11(db, "SUM_TYPE"), { 태양별자리: sunSign, 닉네임: nickname, 유형문장: charRow.type_line, 역량: character.competency, 방식: character.style }),
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
      summary: fillSummary(b11(db, "SUM_2026"), nick),
      quarterHead: b11(db, "HEAD_2026_Q"),
      // A12/A12b intro_match·intro_differ는 주제 문장이 없을 때 쓰는 대체 문장(A12t RULE_ORDER)
      intro:
        themeIntro ?? (q2 && tryFill(args.birthKey ? a12Variant(db, q2, match ? "intro_match" : "intro_differ", args.birthKey) : q2[match ? "intro_match" : "intro_differ"], nick)) ?? "",
      areaLine: areaLine ?? "",
      theme: picked.theme,
      turningPoints: tps.map((t) => tryFill(t, nick)).filter((x): x is string => !!x),
      quarters,
      closing: (q2 && tryFill(args.birthKey ? a12Variant(db, q2, "closing", args.birthKey) : q2.closing, nick)) ?? "",
    },
    care: soft
      ? { note: q2?.care_note ?? "", card: text(db, "A15", "FIX_CARE_CARD", "text").replace(/\s*→\s*\[.*\]\s*$/, "") }
      : null,
    paywallBox: text(db, "A15", "FIX_PAYWALL_BOX", "text").replace(/\s*→\s*\[.*\]\s*$/, ""),
    payPopup: b11(db, "PAY_POPUP"),
    saveCopy: {
      saveDone: b11(db, "SAVE_DONE"),
      loginBig: fillSummary(b11(db, "LOGIN_BIG"), { 닉네임: nickname }) ?? "",
      loginSmall: b11(db, "LOGIN_SMALL"),
      loginDone: b11(db, "LOGIN_DONE"),
    },
    tempPay: {
      note: b11(db, "PAY_TEMP_NOTE"),
      // 버튼 표기 "[회원가입하고 보관하기]"는 화면 버튼으로 따로 그린다
      banner: b11(db, "PAY_TEMP_BANNER").replace(/\s*\[[^\]]*\]\s*$/, ""),
      loginBigPaid: fillSummary(b11(db, "LOGIN_BIG_PAID"), { 닉네임: nickname }) ?? "",
    },
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
