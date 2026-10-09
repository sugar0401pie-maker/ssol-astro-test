// 이벤트 점수·바람 판정 가중치 — 해석 DB v1.2의 C2 v3 '점수·가중치 설정'(초안, 파일럿 30명 후 조정) 값을 그대로 옮겼다.
// 각 값 옆의 W_0xx가 C2 행 ID다. C2가 바뀌면 여기도 같이 바꾼다 — lib/astro/scoringConfig.test.ts가
// data/astro/db의 C2 행과 이 값이 같은지 검사해서, 한쪽만 바뀌면 테스트가 실패한다.
// C2에 없는 값(역행·일월식 점수, 묶기 간격, 2026 상위 개수, 리턴·마일스톤 점수)은 Claude가 정한 출발값이라 따로 표시했다.
// v1.2에서 C2 행 번호가 다시 매겨졌다(W_026 이후) — 아래 W_ 번호는 v1.2 기준.
import type { AspectName, PlanetKey, PointKey } from "./constants.ts";

export const PLANET_WEIGHT: Partial<Record<PlanetKey, number>> = {
  jupiter: 2, saturn: 3, uranus: 3, neptune: 2.5, pluto: 3, mars: 1.5, venus: 1, mercury: 1, // W_001~W_008
};

export const TARGET_WEIGHT: Partial<Record<PointKey, number>> = {
  sun: 3, moon: 3, asc: 2.5, mc: 2.5, mercury: 2, venus: 2, mars: 2, // W_009~W_015
  // C2에 없음: 리턴·마일스톤은 MILESTONE_SCORE로 점수를 따로 준다(아래).
};

export const ASPECT_WEIGHT: Record<AspectName, number> = {
  합: 1.0, 충: 0.9, 사각: 0.9, 삼분: 0.7, 육분: 0.5, // W_016~W_020
};

/** 지속기간 보정(기간 안에 걸친 일수): 30일 미만 0.8, 30~90일 1.0, 90일 이상 1.2 — W_021~W_023 */
export function durationFactor(daysInWindow: number): number {
  if (daysInWindow >= 90) return 1.2;
  if (daysInWindow >= 30) return 1.0;
  return 0.8;
}

/** 리턴·마일스톤은 계산 대신 고정 점수. v1.1 C2(옛 W_032~W_034) 값을 그대로 둔다 —
 *  v1.2 C2에서 이 행이 빠져서(이벤트 순위용 점수라 바람 판정과 무관) 지금은 Claude 출발값으로 관리. */
export const MILESTONE_SCORE = { saturn_return: 9, jupiter_return: 4, uranus_opposition: 7, neptune_square: 7, chiron_return: 7 } as const; // chiron_return: Claude 출발값(천왕성 충·해왕성 사각과 같은 급)

/** 스펙 5-1: Q1 고민 영역을 건드리는 이벤트 가산. (스펙 확정값) */
export const DOMAIN_BOOST = 1.5; // W_029

/** (C2에 없음 — Claude 출발값) 역행 이벤트 점수 = 행성 가중치 × 이 값 */
export const STATION_BASE = 3;
export const STATION_PLANET_WEIGHT = { mercury: 1, venus: 1.2, mars: 1.5 } as const;

/** (C2에 없음 — Claude 출발값) 일식·월식: 출생 행성·축과 합/충 3° 안이면 그 대상 가중치를 곱한다. */
export const ECLIPSE_BASE = 2;
export const ECLIPSE_NATAL_ORB = 3;

/** 빠른 행성 트랜짓 오브 — 연말 파트에만 쓴다. 화성 1.5°(W_026), 금성·수성 1°(W_027). */
export const FAST_TRANSIT_ORB = { mars: 1.5, venus: 1, mercury: 1 } as const;
export const FAST_TRANSIT_PLANETS = ["mars", "venus", "mercury"] as const;

/**
 * 같은 (트랜짓·대상·각도)가 역행 때문에 여러 번 지나면 한 이벤트로 묶는다(마스터스펙 7-1).
 * 앞 구간이 끝나고 이 일수 안에 다시 들어오면 같은 이벤트로 본다.
 */
export const MERGE_GAP_DAYS = { slow: 400, fast: 120 } as const; // (C2에 없음 — Claude 출발값)

/** 기간별로 해석에 쓰는 이벤트 수. 연말 3(W_030), 2027 5(W_031), 2026은 C2에 없어 5(Claude 출발값).
 *  5년은 개수가 아니라 '연도별 최고점 1개 + 나이 마일스톤'(W_032, timeline.ts selectPeriods). */
export const TOP_EVENTS = { year2026: 5, eoy: 3, year2027: 5 } as const;

/** 바람이 걸린 자리(significator) 가중 — W_033~W_036 */
export const WISH_SIG_WEIGHT = { ruler: 1.0, inHouse: 0.8, natural: 1.0, moonAux: 0.6 } as const;

/** 이루어짐(마스터스펙 5-2 v3) — W_037~W_047 */
export const WISH_SCORE = {
  jupiterGood: 2, // 목성 합·삼분·육분
  jupiterHard: 0.5, // 목성 사각·충
  jupiterHousePass: 3, // × 그해 머문 날 비율
  saturnGood: 1.5, // 토성 삼분·육분
  saturnBad: -3, // 토성 합·사각·충 × 섹트
  saturnHousePass: -1.5, // × 비율 × 섹트
  extraPass: 0.3, // 같은 각도 두 번째 통과부터
  profection: 1.5, // 그해의 주인 행성이 주체·대상
  sectDay: 0.7, // 낮 차트 토성
  sectNight: 1.3, // 밤 차트 토성
  changeBonus: 1, // 변화 바람 + 움직이는 해
} as const;

/** 판정: 0 미만 역풍, 0 이상 4 미만 보통, 4 이상 순풍 — W_049~W_051. 경계 ±1 — W_065~W_067 */
export const WISH_THRESHOLDS = { low: 0, high: 4, edge: 1 } as const;

/** 움직임 — W_053~W_057, 표시 기준 W_058~W_059 */
export const MOVEMENT_SCORE = { conj: 1.0, hard: 0.9, soft: 0.4, saturnReturn: 1.0, saturnAngularIngress: 0.8, chironReturn: 1.0 } as const; // chironReturn: C2에 행 없음 — 바람판정_엔진.py MOVE 값(2026-10-09)
export const MOVEMENT_THRESHOLDS = { calm: 1.8, moving: 3.2 } as const;

/** 기질 양태 점수 — W_061 */
export const TEMPERAMENT_WEIGHT = { sun: 3, moon: 3, mercury: 2, venus: 2, mars: 2, jupiter: 1, saturn: 1, asc: 2 } as const;

/**
 * '연말' 파트 기간. 11월 안 출시가 늦어지면 '2027 상반기'로 바꾸는 설정값(마스터스펙 8-2).
 * "eoy": 테스트한 날 ~ 2026-12-31, "h1_2027": 2027-01-01 ~ 2027-06-30
 */
export const EOY_MODE: "eoy" | "h1_2027" = "eoy";
