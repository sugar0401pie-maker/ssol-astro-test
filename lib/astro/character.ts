// 캐릭터 판정(마스터스펙 6-3): 가장 긴장받는 행성 = 역량(행) × 가장 강한 원소 = 방식(열).
// 캐릭터는 개인화 보조 도구일 뿐이다 — 진단·안전 판단·하드 필터에 절대 쓰지 않는다.
import {
  BENEFICS, CHARACTER_GRID, COMPETENCY_BY_PLANET, COMPETENCY_PLANETS, COMPETENCY_TIE_GAP,
  MALEFICS, PLANET_KEYS, STRESS_ORB, STYLES, STYLE_BY_ELEMENT, elementOf,
  type Competency, type CompetencyPlanet, type Element, type PlanetKey, type Style,
} from "./constants.ts";
import { round, sep } from "./natal.ts";

/** 행성별 긴장 점수 분포(오름차순). data/astro/calibration.json — scripts/gen_fixtures.py로 생성. */
export type CalibrationTable = Record<CompetencyPlanet, number[]>;

export interface CharacterResult {
  name: string;
  competency: Competency;
  style: Style;
  percentiles: Record<Competency, number>;
  /** 1·2위 역량이 3%p 안 → 결과 2번 섹션의 "요즘의 나와 더 가까운 건?"(A등급) */
  needs_confirm: boolean;
  element_tie: boolean;
  /** 확인 화면에 보여줄 2위 역량(needs_confirm일 때만 의미 있음) */
  runner_up: Competency;
}

/** 높을수록 편안, 낮을수록 긴장. 품위(도메인 등)는 출생년도 편중 때문에 쓰지 않는다. */
export function stressScore(p: PlanetKey, L: Record<PlanetKey, number>): number {
  let sc = 0;
  for (const q of PLANET_KEYS) {
    if (q === p) continue;
    const d = sep(L[p], L[q]);
    if (MALEFICS.has(q)) {
      for (const a of [0, 90, 180]) {
        const o = Math.abs(d - a);
        if (o < STRESS_ORB) sc -= 1 - o / STRESS_ORB;
      }
    }
    if (BENEFICS.has(q)) {
      for (const a of [0, 60, 120]) {
        const o = Math.abs(d - a);
        if (o < STRESS_ORB) sc += 1 - o / STRESS_ORB;
      }
    }
  }
  return sc;
}

/** 파이썬 bisect.bisect_left와 동일. */
function bisectLeft(arr: number[], x: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function dominantElement(L: Record<PlanetKey, number>, elements: Record<Element, number>): { element: Element; tie: boolean } {
  const best = Math.max(...Object.values(elements));
  const tops = (Object.keys(elements) as Element[]).filter((e) => elements[e] === best);
  if (tops.length === 1) return { element: tops[0], tie: false };
  for (const k of ["moon", "sun"] as const) {
    const e = elementOf(L[k]);
    if (tops.includes(e)) return { element: e, tie: true };
  }
  return { element: tops[0], tie: true };
}

export function characterName(competency: Competency, style: Style): string {
  return CHARACTER_GRID[competency][STYLES.indexOf(style)];
}

export function judgeCharacter(
  L: Record<PlanetKey, number>,
  elements: Record<Element, number>,
  ref: CalibrationTable,
): CharacterResult {
  const pct = {} as Record<CompetencyPlanet, number>;
  for (const p of COMPETENCY_PLANETS) pct[p] = bisectLeft(ref[p], stressScore(p, L)) / ref[p].length;
  // 정렬은 안정적이라 동점이면 COMPETENCY_BY_PLANET 순서를 따른다(프로토타입과 동일).
  const order = [...COMPETENCY_PLANETS].sort((a, b) => pct[a] - pct[b]);
  const competency = COMPETENCY_BY_PLANET[order[0]];
  const { element, tie } = dominantElement(L, elements);
  const style = STYLE_BY_ELEMENT[element];
  const percentiles = {} as Record<Competency, number>;
  for (const p of COMPETENCY_PLANETS) percentiles[COMPETENCY_BY_PLANET[p]] = round(pct[p], 2);
  return {
    name: characterName(competency, style),
    competency,
    style,
    percentiles,
    needs_confirm: pct[order[1]] - pct[order[0]] < COMPETENCY_TIE_GAP,
    element_tie: tie,
    runner_up: COMPETENCY_BY_PLANET[order[1]],
  };
}

/**
 * 역량 동점 확인(마스터스펙 6-3: 1·2위 차이 3%p 미만이면 사용자가 고른다 — 무작위 금지).
 * 고른 역량이 1·2위 중 하나일 때만 받아들이고, 그 외(동점이 아니거나 엉뚱한 값)는 판정을 그대로 둔다.
 */
export function withCompetencyPick(c: CharacterResult, pick: Competency | undefined): CharacterResult {
  if (!pick || !c.needs_confirm || (pick !== c.competency && pick !== c.runner_up)) return c;
  // 고른 뒤에도 needs_confirm은 그대로 둔다 — 결과 2번 섹션에서 두 유형 사이를 다시 바꿀 수 있게(프로토타입, owner 2026-10-10).
  if (pick === c.competency) return c;
  return { ...c, competency: pick, runner_up: c.competency, name: characterName(pick, c.style) };
}
