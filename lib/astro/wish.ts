// Q3 바람이 언제 열리는가(마스터스펙 5-2, 5-3). 연도별 지원도 = 돕는 트랜짓 − 가로막는 트랜짓.
// 점수는 해석 DB C2(W_035~W_042) 그대로:
//   목성이 바람 하우스 통과 +3 × 그해 통과 일수 비율 / 바람 행성·축에 목성 삼분·육분 +2 / 토성 삼분·육분 +1.5
//   토성 합·사각·충 −3 / 명왕성 합·사각·충 −2.5 / 판정 ±2
// 요인 하나가 그해에 조금이라도 걸치면 그 점수를 한 번 더한다(하우스 통과만 일수 비율).
// 판정과 '열리는 해'·근거는 서버가 정하고 AI는 바꾸지 않는다. 없는 순풍 해를 만들지 않는다.
// C등급(출생시간 모름)은 하우스·상승궁·천정을 빼고 행성만으로 판정한다(그 사실은 문장에서 밝힘).
import { ASPECTS, TRANSIT_ORB, type AspectName, type PlanetKey } from "./constants.ts";
import { WISH_MAP, type Q3Wish, type WishPoint } from "./answers.ts";
import { houseOf, type Longitudes } from "./natal.ts";
import { MERGE_GAP_DAYS, STABILITY_INCLUDES_MOON, WISH_SCORE, WISH_THRESHOLD } from "./scoringConfig.ts";
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

const HARMONY: AspectName[] = ["삼분", "육분"];
const HARD: AspectName[] = ["합", "사각", "충"];
const SLOW: PlanetKey[] = ["jupiter", "saturn", "pluto"];

/** (행성, 각도) → C2 점수. 목록에 없으면 바람 지원도에 넣지 않는다. */
export function aspectWishScore(transit: PlanetKey, aspect: AspectName): number | null {
  if (transit === "jupiter" && HARMONY.includes(aspect)) return WISH_SCORE.jupiterHarmony;
  if (transit === "saturn" && HARMONY.includes(aspect)) return WISH_SCORE.saturnHarmony;
  if (transit === "saturn" && HARD.includes(aspect)) return WISH_SCORE.saturnHard;
  if (transit === "pluto" && HARD.includes(aspect)) return WISH_SCORE.plutoHard;
  return null;
}

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
  const factors: Array<DistributiveOmit<WishFactor, "value"> & { base: number }> = [];
  for (const p of points) {
    if (p.startsWith("H")) {
      // 하우스: 목성 통과만 점수가 있다(C2 W_035).
      const house = Number(p.slice(1));
      const runs: Interval[] = [];
      let cur: Interval | null = null;
      days.forEach((d, i) => {
        if (houseOf(pos.jupiter[i], L.asc as number) === house) {
          if (!cur) cur = { from: d, to: d };
          cur.to = d;
        } else if (cur) {
          runs.push(cur);
          cur = null;
        }
      });
      if (cur) runs.push(cur);
      if (runs.length) factors.push({ kind: "house", transit: "jupiter", house, intervals: runs, base: WISH_SCORE.jupiterHousePass });
      continue;
    }
    const target = L[p as keyof Longitudes];
    if (target === undefined) continue;
    for (const k of SLOW) {
      for (const [ang, name] of ASPECTS) {
        const base = aspectWishScore(k, name);
        if (base === null) continue;
        const runs = scanRuns(days, pos[k], target, ang, TRANSIT_ORB[k as keyof typeof TRANSIT_ORB]);
        for (const g of mergeRuns(runs, MERGE_GAP_DAYS.slow)) {
          factors.push({ kind: "aspect", transit: k, target: p, aspect: name, intervals: g, base });
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
      const value = f.kind === "house" ? f.base * (daysIn(iv) / yearDays) : f.base;
      const rounded = Math.round(value * 100) / 100;
      support += rounded;
      const { base: _b, ...rest } = f;
      void _b;
      scored.push({ ...rest, intervals: iv, value: rounded } as WishFactor);
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
