// 기간별 이벤트 추출·점수·선택(마스터스펙 3-2, 5-1, 5-4). 계산은 전부 서버, 결과는 구조화된 값으로만 내보내고
// 글자(날짜 문장·조사)는 lib/report/format.ts가 만든다. 숫자 가중치는 scoringConfig.ts(임시 초안).
import { NextGlobalSolarEclipse, NextLunarEclipse, SearchGlobalSolarEclipse, SearchLunarEclipse, type AstroTime } from "astronomy-engine";
import { ASPECTS, SIGNS, TRANSIT_ORB, signIndex, type AspectName, type PlanetKey, type PointKey } from "./constants.ts";
import { DOMAIN_MAP, type Q1Domain } from "./answers.ts";
import { houseOf, longitude, sep, type Accuracy, type Longitudes } from "./natal.ts";
import {
  ASPECT_WEIGHT, DOMAIN_BOOST, ECLIPSE_BASE, ECLIPSE_NATAL_ORB, EOY_MODE, FAST_TRANSIT_ORB, FAST_TRANSIT_PLANETS,
  MERGE_GAP_DAYS, MILESTONE_SCORE, PLANET_WEIGHT, STATION_BASE, STATION_PLANET_WEIGHT, TARGET_WEIGHT, TOP_EVENTS, durationFactor,
} from "./scoringConfig.ts";
import { computeStationsAndIngress, computeTransits, dailyPositions, dailyRange, sampleTime, scanRuns, type Run } from "./transits.ts";

export interface Interval {
  from: string;
  to: string;
  exact?: string;
}

export type MilestoneKind = "saturn_return" | "jupiter_return" | "uranus_opposition" | "neptune_square";

interface BaseEvent {
  id: string;
  intervals: Interval[];
}

export type TimelineEvent = BaseEvent &
  (
    | {
        kind: "transit";
        transit: PlanetKey;
        target: PointKey;
        aspect: AspectName;
        /** 출생 대상이 놓인 하우스(A·B만) */
        targetHouse: number | null;
        /** 트랜짓 행성이 정확일에 지나는 하우스(A·B만) */
        transitHouse: number | null;
        milestone: MilestoneKind | null;
      }
    | { kind: "retrograde"; planet: "mercury" | "venus" | "mars"; sign: (typeof SIGNS)[number]; house: number | null }
    | { kind: "ingress"; planet: "jupiter" | "saturn" | "uranus" | "neptune" | "pluto"; sign: (typeof SIGNS)[number]; house: number | null }
    | {
        kind: "eclipse";
        eclipse: "solar" | "lunar";
        detail: string;
        sign: (typeof SIGNS)[number];
        house: number | null;
        /** 출생 행성·축과 합/충 3° 안이면 그 대상 */
        contact: { target: PointKey; aspect: "합" | "충" } | null;
      }
  );

export interface ScoredEvent {
  event: TimelineEvent;
  score: number;
  domainRelevant: boolean;
  /** 이 기간 안에 걸친 구간만 */
  intervalsInWindow: Interval[];
}

export interface Window {
  start: string;
  end: string;
}

const DAY = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const dateOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function daysBetween(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / DAY);
}

export function clipIntervals(intervals: Interval[], w: Window): Interval[] {
  const out: Interval[] = [];
  for (const iv of intervals) {
    const from = iv.from > w.start ? iv.from : w.start;
    const to = iv.to < w.end ? iv.to : w.end;
    if (from <= to) out.push({ from, to, ...(iv.exact && iv.exact >= from && iv.exact <= to ? { exact: iv.exact } : {}) });
  }
  return out;
}

export function daysIn(intervals: Interval[]): number {
  return intervals.reduce((s, iv) => s + daysBetween(iv.from, iv.to) + 1, 0);
}

/** 역행으로 같은 각도를 여러 번 지나면 한 이벤트로 묶는다(앞 구간 끝과 다음 시작이 gap일 안이면). */
export function mergeRuns(runs: Run[], gapDays: number): Interval[][] {
  const groups: Interval[][] = [];
  for (const r of [...runs].sort((a, b) => (a.from < b.from ? -1 : 1))) {
    const last = groups[groups.length - 1];
    const iv = { from: r.from, to: r.to, exact: r.exact };
    if (last && daysBetween(last[last.length - 1].to, r.from) <= gapDays) last.push(iv);
    else groups.push([iv]);
  }
  return groups;
}

function houseAt(L: Longitudes, lon: number): number | null {
  return L.asc === undefined ? null : houseOf(lon, L.asc);
}

const MILESTONES: Array<{ kind: MilestoneKind; transit: PlanetKey; target: PlanetKey; angle: number; aspect: AspectName }> = [
  // 토성 리턴은 computeTransits의 saturn→saturn 합으로 이미 나온다.
  { kind: "jupiter_return", transit: "jupiter", target: "jupiter", angle: 0, aspect: "합" },
  { kind: "uranus_opposition", transit: "uranus", target: "uranus", angle: 180, aspect: "충" },
  { kind: "neptune_square", transit: "neptune", target: "neptune", angle: 90, aspect: "사각" },
];
// 키론 리턴(약 50세)은 astronomy-engine이 키론을 계산하지 못해 아직 넣지 않았다.

/**
 * range 전체의 이벤트를 한 번에 뽑는다. fastWindow가 있으면 그 기간만 수성·금성·화성 트랜짓도 뽑는다
 * (빠른 행성은 연말 파트에만 쓰고, 6년치를 다 훑을 필요는 없다).
 */
export function buildTimeline(L: Longitudes, range: Window, fastWindow?: Window): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const days = dailyRange(range.start, range.end);

  // 1) 느린 행성 트랜짓(프로토타입과 같은 런) → 역행 재통과 묶기
  const slow = computeTransits(L, range.start, range.end);
  const byKey = new Map<string, Run[]>();
  for (const e of slow) {
    const key = `${e.transit}|${e.target}|${e.aspect}`;
    byKey.set(key, [...(byKey.get(key) ?? []), { from: e.from, to: e.to, exact: e.exact, orb: 0 }]);
  }
  const pushTransit = (transit: PlanetKey, target: PointKey, aspect: AspectName, intervals: Interval[], milestone: MilestoneKind | null) => {
    const exact = intervals[0].exact ?? intervals[0].from;
    events.push({
      id: `t:${transit}:${target}:${aspect}:${intervals[0].from}`,
      kind: "transit", transit, target, aspect, intervals,
      targetHouse: houseAt(L, L[target] as number),
      transitHouse: houseAt(L, longitude(transit, sampleTime(exact))),
      milestone,
    });
  };
  for (const [key, runs] of byKey) {
    const [transit, target, aspect] = key.split("|") as [PlanetKey, PointKey, AspectName];
    const gap = MERGE_GAP_DAYS.slow;
    for (const g of mergeRuns(runs, gap)) pushTransit(transit, target, aspect, g, target === "saturn" ? "saturn_return" : null);
  }

  // 2) 나이 마일스톤(목성 리턴·천왕성 충·해왕성 사각)
  for (const m of MILESTONES) {
    const pos = dailyPositions(m.transit, days);
    const runs = scanRuns(days, pos, L[m.target], m.angle, TRANSIT_ORB[m.transit as keyof typeof TRANSIT_ORB]);
    for (const g of mergeRuns(runs, MERGE_GAP_DAYS.slow)) pushTransit(m.transit, m.target, m.aspect, g, m.kind);
  }

  // 3) 빠른 행성 트랜짓(연말 파트용)
  if (fastWindow) {
    const fdays = dailyRange(fastWindow.start, fastWindow.end);
    for (const k of FAST_TRANSIT_PLANETS) {
      const pos = dailyPositions(k, fdays);
      for (const g of ["sun", "moon", "mercury", "venus", "mars", "asc", "mc"] as PointKey[]) {
        const target = L[g];
        if (target === undefined || g === k) continue;
        for (const [ang, name] of ASPECTS) {
          for (const grp of mergeRuns(scanRuns(fdays, pos, target, ang, FAST_TRANSIT_ORB), MERGE_GAP_DAYS.fast)) {
            pushTransit(k, g, name, grp, null);
          }
        }
      }
    }
  }

  // 4) 역행 구간(수성·금성·화성), 별자리 이동(목성·토성·천왕성)
  const { stations, ingress } = computeStationsAndIngress(L, range.start, range.end);
  for (const planet of ["mercury", "venus", "mars"] as const) {
    const st = stations.filter((s) => s.planet === planet);
    let open: (typeof st)[number] | null = null;
    // 기간 시작이 이미 역행 중이면 첫 '순행 시작'까지를 한 구간으로 본다.
    if (st[0]?.type === "순행 시작") {
      const x = longitude(planet, sampleTime(range.start));
      open = { planet, type: "역행 시작", date: range.start, sign: SIGNS[signIndex(x)], house: houseAt(L, x) };
    }
    for (const s of st) {
      if (s.type === "역행 시작") open = s;
      else if (open) {
        events.push({ id: `r:${planet}:${open.date}`, kind: "retrograde", planet, sign: open.sign, house: open.house, intervals: [{ from: open.date, to: s.date }] });
        open = null;
      }
    }
    if (open) events.push({ id: `r:${planet}:${open.date}`, kind: "retrograde", planet, sign: open.sign, house: open.house, intervals: [{ from: open.date, to: range.end }] });
  }
  for (const g of ingress) {
    if (g.date === range.start) continue; // 기간 첫날 표시는 '이동'이 아니라 현재 위치
    events.push({ id: `i:${g.planet}:${g.date}`, kind: "ingress", planet: g.planet, sign: g.sign, house: g.house, intervals: [{ from: g.date, to: g.date, exact: g.date }] });
  }
  // 해왕성·명왕성 별자리 이동(2026 전환점 A18 '해왕성 양자리 진입' 등). 프로토타입 출력(목성·토성·천왕성)은 그대로 두고 따로 더한다.
  for (const planet of ["neptune", "pluto"] as const) {
    const pos = dailyPositions(planet, days);
    for (let i = 1; i < days.length; i++) {
      const s = signIndex(pos[i]);
      if (s !== signIndex(pos[i - 1])) {
        events.push({ id: `i:${planet}:${days[i]}`, kind: "ingress", planet, sign: SIGNS[s], house: houseAt(L, pos[i]), intervals: [{ from: days[i], to: days[i], exact: days[i] }] });
      }
    }
  }

  // 5) 일식·월식
  for (const e of eclipses(range)) {
    const lon = e.lon;
    let contact: { target: PointKey; aspect: "합" | "충" } | null = null;
    for (const k of Object.keys(L) as PointKey[]) {
      const d = sep(lon, L[k] as number);
      if (d <= ECLIPSE_NATAL_ORB) { contact = { target: k, aspect: "합" }; break; }
      if (Math.abs(d - 180) <= ECLIPSE_NATAL_ORB) { contact = { target: k, aspect: "충" }; break; }
    }
    events.push({
      id: `e:${e.type}:${e.date}`, kind: "eclipse", eclipse: e.type, detail: e.detail,
      sign: SIGNS[signIndex(lon)], house: houseAt(L, lon), contact,
      intervals: [{ from: e.date, to: e.date, exact: e.date }],
    });
  }
  return events;
}

function eclipses(range: Window): Array<{ type: "solar" | "lunar"; date: string; lon: number; detail: string }> {
  const out: Array<{ type: "solar" | "lunar"; date: string; lon: number; detail: string }> = [];
  const start = new Date(`${range.start}T00:00:00Z`);
  const endMs = toMs(range.end) + DAY;
  // 날짜는 한국 시간 기준으로 표기(사용자 현지 시간대 기본값 Asia/Seoul, 마스터스펙 7-1).
  const kst = (t: AstroTime) => dateOf(t.date.getTime() + 9 * 3_600_000);
  for (let s = SearchGlobalSolarEclipse(start); s.peak.date.getTime() < endMs; s = NextGlobalSolarEclipse(s.peak)) {
    out.push({ type: "solar", date: kst(s.peak), lon: longitude("sun", s.peak), detail: s.kind });
  }
  for (let l = SearchLunarEclipse(start); l.peak.date.getTime() < endMs; l = NextLunarEclipse(l.peak)) {
    out.push({ type: "lunar", date: kst(l.peak), lon: longitude("moon", l.peak), detail: l.kind });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Q1 고민 영역을 건드리는가(5-1). 하우스는 A·B등급에서만 의미가 있다. */
export function touchesDomain(e: TimelineEvent, domain: Q1Domain): boolean {
  const { houses, points } = DOMAIN_MAP[domain];
  const hasPoint = (p: PointKey | PlanetKey) => (points as string[]).includes(p);
  const hasHouse = (h: number | null) => h !== null && houses.includes(h);
  switch (e.kind) {
    case "transit":
      return hasPoint(e.transit) || hasPoint(e.target) || hasHouse(e.targetHouse) || hasHouse(e.transitHouse);
    case "retrograde":
    case "ingress":
      return hasPoint(e.planet) || hasHouse(e.house);
    case "eclipse":
      return hasHouse(e.house) || (e.contact !== null && hasPoint(e.contact.target));
  }
}

export function baseScore(e: TimelineEvent, inWindow: Interval[]): number {
  const n = daysIn(inWindow);
  switch (e.kind) {
    case "transit":
      if (e.milestone) return MILESTONE_SCORE[e.milestone];
      return (PLANET_WEIGHT[e.transit] ?? 1) * (TARGET_WEIGHT[e.target] ?? 1) * ASPECT_WEIGHT[e.aspect] * durationFactor(n);
    case "retrograde":
      return STATION_BASE * STATION_PLANET_WEIGHT[e.planet] * durationFactor(n);
    case "ingress":
      return (PLANET_WEIGHT[e.planet] ?? 1) * 1.5;
    case "eclipse":
      return ECLIPSE_BASE * (e.contact ? (TARGET_WEIGHT[e.contact.target] ?? 1) : 1);
  }
}

export function scoreInWindow(events: TimelineEvent[], w: Window, domain: Q1Domain): ScoredEvent[] {
  const out: ScoredEvent[] = [];
  for (const event of events) {
    const intervalsInWindow = clipIntervals(event.intervals, w);
    if (intervalsInWindow.length === 0) continue;
    const domainRelevant = touchesDomain(event, domain);
    const score = baseScore(event, intervalsInWindow) * (domainRelevant ? DOMAIN_BOOST : 1);
    out.push({ event, score: Math.round(score * 100) / 100, domainRelevant, intervalsInWindow });
  }
  // 점수 내림차순, 같으면 먼저 시작하는 순 — 같은 입력이면 항상 같은 결과.
  return out.sort((a, b) => b.score - a.score || (a.intervalsInWindow[0].from < b.intervalsInWindow[0].from ? -1 : 1) || (a.event.id < b.event.id ? -1 : 1));
}

/** 기간마다 쓰는 행성(마스터스펙 3-2 표). */
export type PeriodKey = "year2026" | "eoy" | "year2027" | "fiveYears";

export function periodFilter(period: PeriodKey, e: TimelineEvent): boolean {
  switch (period) {
    case "year2026":
      return (e.kind === "transit" && ["jupiter", "saturn", "uranus", "neptune", "pluto"].includes(e.transit)) || e.kind === "ingress";
    case "eoy":
      return (e.kind === "transit" && ["mars", "venus", "mercury", "jupiter", "saturn"].includes(e.transit)) || e.kind === "retrograde";
    case "year2027":
      return (
        (e.kind === "transit" && (e.transit === "jupiter" || e.transit === "saturn")) ||
        e.kind === "eclipse" ||
        (e.kind === "retrograde" && e.planet === "mars") ||
        (e.kind === "ingress" && (e.planet === "jupiter" || e.planet === "saturn"))
      );
    case "fiveYears":
      return (
        (e.kind === "transit" && (["saturn", "uranus", "neptune", "pluto"].includes(e.transit) || e.milestone !== null)) ||
        (e.kind === "ingress" && e.planet === "jupiter")
      );
  }
}

export function periodWindows(now: Date): Record<PeriodKey, Window> {
  const today = dateOf(now.getTime() + 9 * 3_600_000); // 한국 날짜
  const eoy: Window = EOY_MODE === "eoy" ? { start: today < "2026-12-31" ? today : "2026-12-31", end: "2026-12-31" } : { start: "2027-01-01", end: "2027-06-30" };
  return {
    year2026: { start: "2026-01-01", end: "2026-12-31" },
    eoy,
    year2027: { start: "2027-01-01", end: "2027-12-31" },
    fiveYears: { start: "2027-01-01", end: "2031-12-31" },
  };
}

export interface PeriodResult {
  window: Window;
  top: ScoredEvent[];
  /** 그 기간의 모든 후보(표·접힌 근거용) — 점수순 */
  all: ScoredEvent[];
  /** Q1 영역을 건드리는 이벤트가 하나도 없음 → "하늘이 조용한 때, 내가 속도를 정할 수 있는 시기"(5-1) */
  domainQuiet: boolean;
}

export function selectPeriods(events: TimelineEvent[], domain: Q1Domain, now: Date): Record<PeriodKey, PeriodResult> {
  const windows = periodWindows(now);
  const out = {} as Record<PeriodKey, PeriodResult>;
  for (const key of Object.keys(windows) as PeriodKey[]) {
    const all = scoreInWindow(events.filter((e) => periodFilter(key, e)), windows[key], domain);
    const top = key === "fiveYears" ? pickFiveYearTop(events, windows[key], domain) : all.slice(0, TOP_EVENTS[key]);
    out[key] = { window: windows[key], top, all, domainQuiet: !all.some((s) => s.domainRelevant) };
  }
  return out;
}

/**
 * 5년 파트는 '연도별 최고점 1개 + 나이 마일스톤'(C2 W_031). 연도마다 그해 안에서 다시 점수를 매겨
 * 가장 높은 이벤트를 고르고, 마일스톤은 점수와 상관없이 넣는다. 같은 이벤트는 한 번만, 시간순.
 */
export function pickFiveYearTop(events: TimelineEvent[], w: Window, domain: Q1Domain): ScoredEvent[] {
  const pool = events.filter((e) => periodFilter("fiveYears", e));
  const picked = new Set<string>();
  const startY = Number(w.start.slice(0, 4));
  const endY = Number(w.end.slice(0, 4));
  for (let y = startY; y <= endY; y++) {
    const best = scoreInWindow(pool, { start: `${y}-01-01`, end: `${y}-12-31` }, domain)[0];
    if (best) picked.add(best.event.id);
  }
  for (const e of pool) if (e.kind === "transit" && e.milestone && clipIntervals(e.intervals, w).length) picked.add(e.id);
  return scoreInWindow(pool.filter((e) => picked.has(e.id)), w, domain).sort((a, b) =>
    a.intervalsInWindow[0].from < b.intervalsInWindow[0].from ? -1 : 1,
  );
}

/** 2026 회고의 '올해의 전환점': 특정 날짜 이벤트(토성 리턴 등 마일스톤, 외행성·목성·토성 별자리 이동). */
export function turningPoints(events: TimelineEvent[], w: Window): TimelineEvent[] {
  return events
    .filter((e) => (e.kind === "ingress" || (e.kind === "transit" && e.milestone !== null)) && clipIntervals(e.intervals, w).length > 0)
    .sort((a, b) => ((a.intervals[0].exact ?? a.intervals[0].from) < (b.intervals[0].exact ?? b.intervals[0].from) ? -1 : 1));
}

/** 시기 단위로 표의 행을 만든다: 한 해 = 분기, 3개월 안팎 = 월, 5년 = 연(02_디자인가이드 6장). */
export type Unit = "quarter" | "month" | "year";

export interface PeriodRow {
  unit: Unit;
  /** 분기: 1–4, 월: 1–12, 연: 연도 */
  index: number;
  year: number;
  window: Window;
  events: ScoredEvent[];
}

export function groupRows(scored: ScoredEvent[], w: Window, unit: Unit): PeriodRow[] {
  const rows: PeriodRow[] = [];
  const [sy, sm] = w.start.split("-").map(Number);
  const [ey, em] = w.end.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const push = (index: number, year: number, from: string, to: string) => {
    const win = { start: from < w.start ? w.start : from, end: to > w.end ? w.end : to };
    rows.push({ unit, index, year, window: win, events: scored.filter((s) => clipIntervals(s.intervalsInWindow, win).length > 0) });
  };
  if (unit === "year") {
    for (let y = sy; y <= ey; y++) push(y, y, `${y}-01-01`, `${y}-12-31`);
  } else if (unit === "month") {
    for (let y = sy, m = sm; y < ey || (y === ey && m <= em); m === 12 ? (y++, (m = 1)) : m++) {
      push(m, y, `${y}-${pad(m)}-01`, `${y}-${pad(m)}-${lastDay(y, m)}`);
    }
  } else {
    for (let y = sy; y <= ey; y++) {
      for (let q = 1; q <= 4; q++) {
        const m1 = (q - 1) * 3 + 1;
        const from = `${y}-${pad(m1)}-01`;
        const to = `${y}-${pad(m1 + 2)}-${lastDay(y, m1 + 2)}`;
        if (to < w.start || from > w.end) continue;
        push(q, y, from, to);
      }
    }
  }
  return rows;
}

export type { Accuracy };
