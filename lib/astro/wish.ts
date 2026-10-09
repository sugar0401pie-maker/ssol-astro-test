// Q3 바람이 언제 열리는가 — 바람 판정 v3(마스터스펙 5-2·5-3, 2026-10-08).
// owner 전달 원본 docs/reference/12_바람판정v3/바람판정_엔진.py를 그대로 옮겼다. lib/astro/wish.test.ts가
// 그 원본으로 만든 기준값(test/fixtures/wish-v3.json, scripts/gen_wish_fixtures.py)과 같은 점수를 내는지 검사한다.
//
// 두 값을 따로 계산한다.
//   이루어짐: 바람이 걸린 자리(하우스 지배 행성·하우스 안 행성·주제 행성·달)에 대한 목성(가점)·토성(감점, 섹트 보정)
//            각도 + 목성·토성의 바람 하우스 통과. 그해의 주인 행성(연간 프로펙션)이 걸리면 ×1.5.
//   움직임:  천왕성·해왕성·명왕성이 개인 지점에 닿는 각도 + 토성 리턴 + 토성의 각 하우스(1·4·7·10) 이동. 좋고 나쁨 없음.
// 판정·열리는 해·근거는 서버가 정하고 AI는 바꾸지 않는다. 없는 순풍 해를 만들지 않는다.
//
// 원본과 다른 점(둘 다 Claude 판단, owner 검토 가능):
//  ① 역풍 기준: 원본 label()은 '0 이하'를 역풍으로 보지만 스펙·C2(W_049)는 '0 미만'이다 → 스펙대로 0은 보통.
//     (트랜짓이 하나도 없어 점수가 정확히 0인 해 — '막는 흐름이 돕는 흐름보다 크다'가 아니므로 보통이 맞다.)
//  ② C등급(시간 모름)의 섹트: 낮·밤을 알 수 없어 토성에 섹트 보정을 하지 않는다(×1). 원본은 값을 받기만 한다.
import { Body, Equator, Horizon, MakeTime, Observer } from "astronomy-engine";
import { ASPECTS, SIGNS, TRANSIT_ORB, signIndex, type AspectName, type PlanetKey, type PointKey } from "./constants.ts";
import { CHANGE_WISHES, WISH_MAP, type Q3Wish } from "./answers.ts";
import type { Longitudes } from "./natal.ts";
import {
  MOVEMENT_SCORE, MOVEMENT_THRESHOLDS, TEMPERAMENT_WEIGHT, WISH_SCORE, WISH_SIG_WEIGHT, WISH_THRESHOLDS,
} from "./scoringConfig.ts";
import type { Interval } from "./timeline.ts";
import { dailyPositions, dailyRange, scanRuns } from "./transits.ts";
import { chironReturnYears } from "./chiron.ts";

export type WishLevel = "순풍" | "보통" | "역풍";
export const WISH_LEVEL_DISPLAY: Record<WishLevel, string> = {
  순풍: "활짝 열리는 해(순풍)",
  보통: "내 손에 달린 해(보통)",
  역풍: "기반을 다지는 해(역풍)",
};
export type MovementLabel = "움직이는 해" | "잔잔한 해" | "";
export type EdgeKey = "EDGE_UP_CLEAR" | "EDGE_UP_MIXED" | "EDGE_MID_LOW" | "EDGE_LOW_HIGH";
export const EDGE_LABEL: Record<EdgeKey, string> = {
  EDGE_UP_CLEAR: "활짝 열리는 해에 가까움",
  EDGE_UP_MIXED: "활짝 열리는 해에 가까움",
  EDGE_MID_LOW: "기반을 다지는 해와 경계",
  EDGE_LOW_HIGH: "내 손에 달린 해와 경계",
};
export type Temperament = "활동" | "고정" | "변통";

export type WishFactor =
  | { kind: "aspect"; transit: PlanetKey; target: PointKey; aspect: AspectName; intervals: Interval[]; exact: string; value: number; profection: boolean }
  | { kind: "house"; transit: PlanetKey; house: number; intervals: Interval[]; days: number; value: number };

export interface MovementFactor {
  kind: "outer" | "saturn_return" | "saturn_ingress" | "chiron_return";
  transit: PlanetKey | "chiron";
  /** outer: 닿은 개인 지점 */
  target?: PointKey;
  aspect?: AspectName;
  /** saturn_ingress: 들어간 별자리·하우스 */
  sign?: string;
  house?: number;
  exact: string;
  value: number;
}

export interface WishYear {
  year: number;
  /** 이루어짐 점수(변화 바람 가점 포함). 화면에는 쓰지 않는다. */
  support: number;
  /** 변화 바람 가점 전 점수(원본 judge_years의 support와 같음) */
  baseSupport: number;
  level: WishLevel;
  /** 기준선 ±1 안이면 경계 표시(B10) */
  edge: EdgeKey | null;
  /** 그해 감점 요인이 없었는지(EDGE_UP_CLEAR/MIXED 구분) */
  noMinus: boolean;
  movement: number;
  movementLabel: MovementLabel;
  /** 순풍·보통이면 돕는 근거 상위, 역풍이면 막는 근거 상위(최대 3개) */
  reasons: WishFactor[];
  /** 그해 점수에 들어간 모든 요인(접힌 근거·검수용) */
  factors: WishFactor[];
  moves: MovementFactor[];
  /** 그해(생일 이후)의 주인 행성 — A·B등급만 */
  profectionLord: PlanetKey | null;
}

export interface WishResult {
  wish: Q3Wish;
  significators: Partial<Record<PointKey, number>>;
  /** C등급이라 하우스·지배 행성·축·프로펙션을 뺐는지 */
  housesExcluded: boolean;
  dayChart: boolean | null;
  temperament: Temperament;
  years: WishYear[];
  /** 첫 순풍 해. 없으면 null */
  firstOpenYear: number | null;
  /** 순풍이 하나도 없을 때 이루어짐이 가장 높은 해('가장 가까워지는 해') */
  closestYear: number | null;
}

/** 전통 7행성 지배(양·전갈=화성, 황소·천칭=금성, 쌍둥이·처녀=수성, 게=달, 사자=태양, 사수·물고기=목성, 염소·물병=토성) */
export const TRADITIONAL_RULER: readonly PlanetKey[] = [
  "mars", "venus", "mercury", "moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn", "saturn", "jupiter",
];
const TRAD7: PlanetKey[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
const MODALITY: Temperament[] = ["활동", "고정", "변통"];
const ELEMENT_ORDER = ["불", "흙", "공기", "물"] as const;
const ASPECT_FACTOR: Record<AspectName, number> = { 합: 1.0, 육분: 0.5, 사각: 0.9, 삼분: 0.7, 충: 0.9 };

/** 출생 시 태양이 지평선 위면 낮 차트(섹트). 원본 is_day_chart와 같다. */
export function isDayChart(utc: Date, lat: number, lng: number): boolean {
  const t = MakeTime(utc);
  const obs = new Observer(lat, lng, 0);
  const eq = Equator(Body.Sun, t, obs, true, true);
  return Horizon(t, obs, eq.ra, eq.dec, "normal").altitude > 0;
}

/** 기질(움직임 문장 버전, B9): 양태 점수 최강, 단 불 원소가 가장 강하면 '활동'. */
export function temperamentOf(L: Longitudes): Temperament {
  const m: Record<Temperament, number> = { 활동: 0, 고정: 0, 변통: 0 };
  const e: Record<string, number> = { 불: 0, 흙: 0, 공기: 0, 물: 0 };
  for (const [k, w] of Object.entries(TEMPERAMENT_WEIGHT) as Array<[PointKey, number]>) {
    const lon = L[k];
    if (lon === undefined) continue; // C등급이면 상승궁 없음
    const s = signIndex(lon);
    m[MODALITY[s % 3]] += w;
    if (k !== "asc") e[ELEMENT_ORDER[s % 4]] += w;
  }
  // 동점이면 원본(파이썬 max)처럼 먼저 점수가 붙은 양태 — 태양의 양태부터 순서대로 센 순서를 따른다.
  const order: Temperament[] = [];
  for (const k of Object.keys(TEMPERAMENT_WEIGHT) as PointKey[]) {
    const lon = L[k];
    if (lon !== undefined && !order.includes(MODALITY[signIndex(lon) % 3])) order.push(MODALITY[signIndex(lon) % 3]);
  }
  const top = order.reduce((a, b) => (m[b] > m[a] ? b : a));
  const fireStrong = e["불"] === Math.max(...Object.values(e));
  return top === "활동" || fireStrong ? "활동" : top;
}

/** 바람이 걸린 자리 {지점: 가중}. */
export function significators(L: Longitudes, wish: Q3Wish): Partial<Record<PointKey, number>> {
  const { houses, natural } = WISH_MAP[wish];
  const timed = L.asc !== undefined;
  const pts: Partial<Record<PointKey, number>> = {};
  const add = (p: PointKey, w: number) => {
    if (L[p] === undefined) return;
    pts[p] = Math.max(pts[p] ?? 0, w);
  };
  if (timed) {
    const ascS = signIndex(L.asc as number);
    for (const h of houses) {
      const s = (ascS + h - 1) % 12;
      add(TRADITIONAL_RULER[s], WISH_SIG_WEIGHT.ruler);
      for (const p of TRAD7) if (signIndex(L[p]) === s) add(p, WISH_SIG_WEIGHT.inHouse);
    }
  }
  for (const p of natural) {
    if ((p === "asc" || p === "mc") && !timed) continue;
    add(p, WISH_SIG_WEIGHT.natural);
  }
  add("moon", WISH_SIG_WEIGHT.moonAux);
  return pts;
}

/** 만 나이(생일 기준)만큼 상승궁에서 옮긴 별자리의 지배 행성. birthDate는 현지 출생일 'YYYY-MM-DD'. */
export function profectionLord(ascLon: number, birthDate: string, day: string): PlanetKey {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = day.split("-").map(Number);
  const age = y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
  return TRADITIONAL_RULER[(((signIndex(ascLon) + age) % 12) + 12) % 12];
}

export function levelOf(support: number): WishLevel {
  if (support >= WISH_THRESHOLDS.high) return "순풍";
  if (support < WISH_THRESHOLDS.low) return "역풍";
  return "보통";
}

export function movementLabelOf(movement: number): MovementLabel {
  if (movement >= MOVEMENT_THRESHOLDS.moving) return "움직이는 해";
  if (movement <= MOVEMENT_THRESHOLDS.calm) return "잔잔한 해";
  return "";
}

export function edgeOf(level: WishLevel, support: number, noMinus: boolean): EdgeKey | null {
  const { low, high, edge } = WISH_THRESHOLDS;
  if (level === "보통" && support >= high - edge) return noMinus ? "EDGE_UP_CLEAR" : "EDGE_UP_MIXED";
  if (level === "보통" && support < low + edge) return "EDGE_MID_LOW";
  if (level === "역풍" && support >= low - edge) return "EDGE_LOW_HIGH";
  return null;
}

const r2 = (x: number) => Math.round(x * 100) / 100;
const yearOf = (d: string) => Number(d.slice(0, 4));

export interface WishContext {
  /** 현지 출생일 'YYYY-MM-DD'(프로펙션) */
  birthDate: string;
  /** 낮 차트 여부. C등급이면 null(섹트 보정 없음) */
  dayChart: boolean | null;
}

/** 저장된 출생 정보 → 바람 판정에 필요한 값. C등급(시간 모름)은 낮·밤을 알 수 없어 null. */
export function wishContextOf(stored: { local: string; utc: string; place: { lat: number; lng: number } }, accuracy: "A" | "B" | "C"): WishContext {
  return {
    birthDate: stored.local.slice(0, 10),
    dayChart: accuracy === "C" ? null : isDayChart(new Date(stored.utc), stored.place.lat, stored.place.lng),
  };
}

export function computeWish(
  L: Longitudes,
  wish: Q3Wish,
  ctx: WishContext,
  opts: { startYear?: number; endYear?: number } = {},
): WishResult {
  const { startYear = 2027, endYear = 2031 } = opts;
  const timed = L.asc !== undefined;
  const sig = significators(L, wish);
  // C등급은 호출하는 쪽(wishContextOf)이 dayChart=null을 넘겨 섹트 보정을 끈다(위 ②).
  const sect = ctx.dayChart === null ? 1 : ctx.dayChart ? WISH_SCORE.sectDay : WISH_SCORE.sectNight;
  const days = dailyRange(`${startYear}-01-01`, `${endYear}-12-31`);
  const pos = {} as Record<PlanetKey, number[]>;
  for (const k of ["jupiter", "saturn", "uranus", "neptune", "pluto"] as PlanetKey[]) pos[k] = dailyPositions(k, days);

  const acc = new Map<number, { support: number; movement: number; factors: WishFactor[]; moves: MovementFactor[] }>();
  for (let y = startYear; y <= endYear; y++) acc.set(y, { support: 0, movement: 0, factors: [], moves: [] });

  // 1) 이루어짐 — 각도 (화성·금성·외행성은 넣지 않는다)
  for (const planet of ["jupiter", "saturn"] as const) {
    for (const [p, w] of Object.entries(sig) as Array<[PointKey, number]>) {
      for (const [ang, name] of ASPECTS) {
        const good = planet === "jupiter" ? name === "합" || name === "삼분" || name === "육분" : name === "삼분" || name === "육분";
        const base =
          planet === "jupiter" ? (good ? WISH_SCORE.jupiterGood : WISH_SCORE.jupiterHard) : good ? WISH_SCORE.saturnGood : WISH_SCORE.saturnBad * sect;
        const seen = new Map<number, number>();
        for (const run of scanRuns(days, pos[planet], L[p] as number, ang, TRANSIT_ORB[planet])) {
          const y = yearOf(run.exact);
          const a = acc.get(y);
          if (!a) continue;
          const k = (seen.get(y) ?? 0) === 0 ? 1 : WISH_SCORE.extraPass;
          seen.set(y, (seen.get(y) ?? 0) + 1);
          const lord = timed ? profectionLord(L.asc as number, ctx.birthDate, run.exact) : null;
          const prof = lord !== null && (lord === p || lord === planet);
          const value = base * ASPECT_FACTOR[name] * w * k * (prof ? WISH_SCORE.profection : 1);
          a.support += value;
          a.factors.push({
            kind: "aspect", transit: planet, target: p, aspect: name, intervals: [{ from: run.from, to: run.to }],
            exact: run.exact, value: r2(value), profection: prof,
          });
        }
      }
    }
  }

  // 1-b) 목성·토성이 바람 하우스를 지나는 기간
  if (timed) {
    const ascS = signIndex(L.asc as number);
    for (const h of WISH_MAP[wish].houses) {
      const s = (ascS + h - 1) % 12;
      for (const planet of ["jupiter", "saturn"] as const) {
        const wt = planet === "jupiter" ? WISH_SCORE.jupiterHousePass : WISH_SCORE.saturnHousePass * sect;
        for (let y = startYear; y <= endYear; y++) {
          const idx = days.map((d, i) => [d, i] as const).filter(([d]) => yearOf(d) === y);
          const inside = idx.filter(([, i]) => signIndex(pos[planet][i]) === s).map(([d]) => d);
          if (!inside.length) continue;
          const value = (wt * inside.length) / idx.length;
          const a = acc.get(y)!;
          a.support += value;
          a.factors.push({ kind: "house", transit: planet, house: h, intervals: runsOf(inside), days: inside.length, value: r2(value) });
        }
      }
    }
  }

  // 2) 움직임
  const personal: PointKey[] = ["sun", "moon", "mercury", "venus", "mars", ...(timed ? (["asc", "mc"] as PointKey[]) : [])];
  for (const planet of ["uranus", "neptune", "pluto"] as const) {
    for (const p of personal) {
      for (const [ang, name] of ASPECTS) {
        const mw = ang === 0 ? MOVEMENT_SCORE.conj : ang === 90 || ang === 180 ? MOVEMENT_SCORE.hard : MOVEMENT_SCORE.soft;
        const seen = new Set<number>();
        for (const run of scanRuns(days, pos[planet], L[p] as number, ang, TRANSIT_ORB[planet])) {
          const y = yearOf(run.exact);
          const a = acc.get(y);
          if (!a || seen.has(y)) continue;
          seen.add(y);
          a.movement += mw;
          a.moves.push({ kind: "outer", transit: planet, target: p, aspect: name, exact: run.exact, value: mw });
        }
      }
    }
  }
  for (const run of scanRuns(days, pos.saturn, L.saturn, 0, TRANSIT_ORB.saturn)) {
    const a = acc.get(yearOf(run.exact));
    if (!a) continue;
    a.movement += MOVEMENT_SCORE.saturnReturn;
    a.moves.push({ kind: "saturn_return", transit: "saturn", exact: run.exact, value: MOVEMENT_SCORE.saturnReturn });
  }
  // 키론 리턴(약 50세): 원본 엔진과 같이 해마다 한 번, 출생일 기준(시간 모름이어도 계산)
  for (const [y, exact] of chironReturnYears(ctx.birthDate, [...acc.keys()])) {
    const a = acc.get(y)!;
    a.movement += MOVEMENT_SCORE.chironReturn;
    a.moves.push({ kind: "chiron_return", transit: "chiron", exact, value: MOVEMENT_SCORE.chironReturn });
  }
  if (timed) {
    const ascS = signIndex(L.asc as number);
    let prev: number | null = null;
    days.forEach((d, i) => {
      const s = signIndex(pos.saturn[i]);
      const a = acc.get(yearOf(d));
      if (prev !== null && s !== prev && a) {
        const h = ((s - ascS + 12) % 12) + 1;
        if (h === 1 || h === 4 || h === 7 || h === 10) {
          a.movement += MOVEMENT_SCORE.saturnAngularIngress;
          a.moves.push({ kind: "saturn_ingress", transit: "saturn", sign: SIGNS[s], house: h, exact: d, value: MOVEMENT_SCORE.saturnAngularIngress });
        }
      }
      prev = s;
    });
  }

  // 3) 판정
  const years: WishYear[] = [];
  for (const [y, a] of acc) {
    const movementLabel = movementLabelOf(a.movement);
    const support = a.support + (CHANGE_WISHES.has(wish) && movementLabel === "움직이는 해" ? WISH_SCORE.changeBonus : 0);
    const level = levelOf(support);
    const noMinus = !a.factors.some((f) => f.value < 0);
    const reasons =
      level === "역풍"
        ? a.factors.filter((f) => f.value < 0).sort((x, z) => x.value - z.value).slice(0, 3)
        : a.factors.filter((f) => f.value > 0).sort((x, z) => z.value - x.value).slice(0, 3);
    years.push({
      year: y, support, baseSupport: a.support, level, edge: edgeOf(level, support, noMinus), noMinus,
      movement: a.movement, movementLabel, reasons, factors: a.factors, moves: a.moves,
      profectionLord: timed ? profectionLord(L.asc as number, ctx.birthDate, `${y}-12-31`) : null,
    });
  }

  const first = years.find((y) => y.level === "순풍") ?? null;
  const closest = first ? null : years.reduce<WishYear | null>((best, y) => (!best || y.support > best.support ? y : best), null);
  return {
    wish,
    significators: sig,
    housesExcluded: !timed,
    dayChart: ctx.dayChart,
    temperament: temperamentOf(L),
    years,
    firstOpenYear: first?.year ?? null,
    closestYear: closest?.year ?? null,
  };
}

/** 연속된 날짜 목록을 구간으로 묶는다. */
function runsOf(sortedDays: string[]): Interval[] {
  const out: Interval[] = [];
  for (const d of sortedDays) {
    const last = out[out.length - 1];
    if (last && Date.parse(`${d}T00:00:00Z`) - Date.parse(`${last.to}T00:00:00Z`) === 86_400_000) last.to = d;
    else out.push({ from: d, to: d });
  }
  return out;
}
