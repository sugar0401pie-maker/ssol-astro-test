// 캐릭터 판정(마스터스펙 6-3): 가장 긴장받는 행성 = 역량(행) × 가장 강한 원소 = 방식(열).
// 캐릭터는 개인화 보조 도구일 뿐이다 — 진단·안전 판단·하드 필터에 절대 쓰지 않는다.
import {
  BENEFICS, CHARACTER_GRID, COMPETENCY_BY_PLANET, COMPETENCY_PLANETS, COMPETENCY_TIE_GAP,
  MALEFICS, PLANET_KEYS, STRESS_ORB, STYLES, STYLE_BY_ELEMENT, elementOf,
  type Competency, type CompetencyPlanet, type Element, type PlanetKey, type Style,
} from "./constants.ts";
import { round, sep } from "./natal.ts";
import { elementOfStyle, findOption, type StyleSource, type TypeOption, type TypePick } from "./typeChoice.ts";

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
  /** 4개 중 고르기 선택지(A등급 역량 동점·B/C 후보, owner 2026-10-11) — 고른 뒤에도 다시 바꿀 수 있게 원래 계산 기준으로 */
  options?: TypeOption[];
  /** 고른 방식이 어디서 왔는지(없으면 1등 원소) — '왜 이 유형인가' 마지막 문장용 */
  style_source?: StyleSource;
  /** 차트에서 가장 강한 원소(고른 방식이 1등 원소가 아닐 때 문장에 씀) */
  strong_element?: Element;
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

/**
 * 4개 중 고른 유형 반영(owner 2026-10-11). 선택지 안에 있을 때만 받아들이고, 아니면 판정 그대로.
 * 2위 역량은 고른 역량이 아닌 쪽으로 바꿔 둔다(채팅 요약 등에서 '다른 후보'로 쓰임).
 */
export function withTypePick(c: CharacterResult, pick: TypePick | undefined): CharacterResult {
  const opt = findOption(c.options, pick);
  if (!opt || (opt.competency === c.competency && opt.style === c.style)) return c;
  const other = c.options!.find((o) => o.competency !== opt.competency)?.competency ?? c.runner_up;
  return {
    ...c,
    competency: opt.competency,
    style: opt.style,
    name: characterName(opt.competency, opt.style),
    runner_up: other,
    ...(opt.source !== "dominant" ? { style_source: opt.source, strong_element: elementOfStyle(c.style) } : {}),
  };
}
