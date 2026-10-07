// Q3 바람이 언제 열리는가(마스터스펙 5-2, 5-3). 연도별 지원도 = 돕는 트랜짓 − 가로막는 트랜짓.
//   돕는 것: 목성의 합(통과), 느린 행성의 삼분·육분, 목성이 바람 하우스를 지나는 기간
//   막는 것: 토성·명왕성의 합·사각·충, 토성·명왕성이 바람 하우스를 지나는 기간
// 판정과 '열리는 해'·근거는 서버가 정하고 AI는 바꾸지 않는다. 없는 순풍 해를 만들지 않는다.
// C등급(출생시간 모름)은 하우스·상승궁·천정을 빼고 행성만으로 판정한다(그 사실은 문장에서 밝힘).
import { ASPECTS, TRANSIT_ORB, type AspectName, type PlanetKey } from "./constants.ts";
import { WISH_MAP, type Q3Wish, type WishPoint } from "./answers.ts";
import { houseOf, type Longitudes } from "./natal.ts";
import {
  ASPECT_WEIGHT, MERGE_GAP_DAYS, PLANET_WEIGHT, STABILITY_INCLUDES_MOON, WISH_HOUSE_BLOCK,
  WISH_HOUSE_SUPPORT, WISH_THRESHOLD, durationFactor,
} from "./scoringConfig.ts";
import { clipIntervals, daysIn, mergeRuns, type Interval } from "./timeline.ts";
import { dailyPositions, dailyRange, scanRuns } from "./transits.ts";

export type WishLevel = "순풍" | "보통" | "역풍";

export type WishFactor =
  | { kind: "aspect"; transit: PlanetKey; target: WishPoint; aspect: AspectName; intervals: Interval[]; value: number }
  | { kind: "house"; transit: PlanetKey; house: number; intervals: Interval[]; value: number };

export interface WishYear {
  year: number;
  support: number;
  level: WishLevel;
  /** 순풍이면 돕는 근거 상위, 역풍이면 막는 근거 상위(최대 3개) */
  reasons: WishFactor[];
  /** 그해 점수에 들어간 모든 요인(접힌 근거·검수용) */
  factors: WishFactor[];
}

export interface WishResult {
  wish: Q3Wish;
  points: WishPoint[];
  /** C등급이라 하우스·축을 뺐는지 */
  housesExcluded: boolean;
  years: WishYear[];
  /** 첫 순풍 해. 없으면 null */
  firstOpenYear: number | null;
  /** 순풍이 하나도 없을 때 지원도가 가장 높은 해('가장 가까워지는 해') */
  closestYear: number | null;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

const HELP_ASPECTS: AspectName[] = ["삼분", "육분"];
const BLOCK_ASPECTS: AspectName[] = ["합", "사각", "충"];
const SLOW: PlanetKey[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];
const BLOCKERS: PlanetKey[] = ["saturn", "pluto"];

export function wishPoints(wish: Q3Wish, stabilityIncludesMoon = STABILITY_INCLUDES_MOON): WishPoint[] {
  const pts = [...WISH_MAP[wish].points];
  if (wish === "안정" && stabilityIncludesMoon) pts.push("moon");
  return pts;
}

export function levelOf(support: number): WishLevel {
  if (support >= WISH_THRESHOLD) return "순풍";
  if (support <= -WISH_THRESHOLD) return "역풍";
  return "보통";
}

export function computeWish(
  L: Longitudes,
  wish: Q3Wish,
  opts: { startYear?: number; endYear?: number; stabilityIncludesMoon?: boolean } = {},
): WishResult {
  const { startYear = 2027, endYear = 2031 } = opts;
  const timed = L.asc !== undefined;
  const all = wishPoints(wish, opts.stabilityIncludesMoon);
  const points = all.filter((p) => (p.startsWith("H") || p === "asc" || p === "mc" ? timed : true));
  const range = { start: `${startYear}-01-01`, end: `${endYear}-12-31` };
  const days = dailyRange(range.start, range.end);
  const pos = Object.fromEntries(SLOW.map((k) => [k, dailyPositions(k, days)])) as Record<PlanetKey, number[]>;

  // 전 기간의 요인(이벤트)을 먼저 뽑고, 연도별로 잘라 점수를 매긴다.
  const factors: Array<DistributiveOmit<WishFactor, "value"> & { sign: 1 | -1 }> = [];
  for (const p of points) {
    if (p.startsWith("H")) {
      const house = Number(p.slice(1));
      for (const k of ["jupiter", ...BLOCKERS] as PlanetKey[]) {
        const runs: Interval[] = [];
        let cur: Interval | null = null;
        days.forEach((d, i) => {
          if (houseOf(pos[k][i], L.asc as number) === house) {
            if (!cur) cur = { from: d, to: d };
            cur.to = d;
          } else if (cur) {
            runs.push(cur);
            cur = null;
          }
        });
        if (cur) runs.push(cur);
        if (runs.length) factors.push({ kind: "house", transit: k, house, intervals: runs, sign: k === "jupiter" ? 1 : -1 });
      }
      continue;
    }
    const target = L[p as keyof Longitudes];
    if (target === undefined) continue;
    for (const k of SLOW) {
      for (const [ang, name] of ASPECTS) {
        const helps = (k === "jupiter" && name === "합") || HELP_ASPECTS.includes(name);
        const blocks = BLOCKERS.includes(k) && BLOCK_ASPECTS.includes(name);
        if (!helps && !blocks) continue;
        const runs = scanRuns(days, pos[k], target, ang, TRANSIT_ORB[k as keyof typeof TRANSIT_ORB]);
        for (const g of mergeRuns(runs, MERGE_GAP_DAYS.slow)) {
          factors.push({ kind: "aspect", transit: k, target: p, aspect: name, intervals: g, sign: helps ? 1 : -1 });
        }
      }
    }
  }

  const years: WishYear[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const w = { start: `${y}-01-01`, end: `${y}-12-31` };
    const yearDays = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 366 : 365;
    const scored: WishFactor[] = [];
    let support = 0;
    for (const f of factors) {
      const iv = clipIntervals(f.intervals, w);
      if (!iv.length) continue;
      const n = daysIn(iv);
      let value: number;
      if (f.kind === "house") {
        value = f.sign * (f.sign > 0 ? WISH_HOUSE_SUPPORT : WISH_HOUSE_BLOCK) * (n / yearDays);
      } else {
        value = f.sign * (PLANET_WEIGHT[f.transit] ?? 1) * ASPECT_WEIGHT[f.aspect] * durationFactor(n);
      }
      value = Math.round(value * 100) / 100;
      support += value;
      const { sign: _s, ...rest } = f;
      void _s;
      scored.push({ ...rest, intervals: iv, value } as WishFactor);
    }
    support = Math.round(support * 100) / 100;
    const level = levelOf(support);
    const reasons =
      level === "순풍"
        ? scored.filter((s) => s.value > 0).sort((a, b) => b.value - a.value).slice(0, 3)
        : level === "역풍"
          ? scored.filter((s) => s.value < 0).sort((a, b) => a.value - b.value).slice(0, 3)
          : [];
    years.push({ year: y, support, level, reasons, factors: scored });
  }

  const first = years.find((y) => y.level === "순풍") ?? null;
  // 순풍이 없으면 '가장 가까워지는 해' — 지원도 최고, 같으면 앞선 해.
  const closest = first ? null : years.reduce<WishYear | null>((best, y) => (!best || y.support > best.support ? y : best), null);
  return {
    wish,
    points,
    housesExcluded: !timed,
    years,
    firstOpenYear: first?.year ?? null,
    closestYear: closest?.year ?? null,
  };
}
