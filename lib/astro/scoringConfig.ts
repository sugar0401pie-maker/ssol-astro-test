// 이벤트 점수·바람 지원도 가중치 — 해석 DB v1.1의 C2 '점수·가중치 설정'(초안, 파일럿 30명 후 조정) 값을 그대로 옮겼다.
// 각 값 옆의 W_0xx가 C2 행 ID다. C2가 바뀌면 여기도 같이 바꾼다 — lib/astro/scoringConfig.test.ts가
// data/astro/db의 C2 행과 이 값이 같은지 검사해서, 한쪽만 바뀌면 테스트가 실패한다.
// C2에 없는 값(역행·일월식 점수, 묶기 간격, 2026 상위 개수)은 Claude가 정한 출발값이라 따로 표시했다.
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

/** 리턴·마일스톤은 계산 대신 고정 점수 — W_032~W_034 */
export const MILESTONE_SCORE = { saturn_return: 9, jupiter_return: 4, uranus_opposition: 7, neptune_square: 7 } as const;

/** 스펙 5-1: Q1 고민 영역을 건드리는 이벤트 가산. (스펙 확정값) */
export const DOMAIN_BOOST = 1.5; // W_028

/** (C2에 없음 — Claude 출발값) 역행 이벤트 점수 = 행성 가중치 × 이 값 */
export const STATION_BASE = 3;
export const STATION_PLANET_WEIGHT = { mercury: 1, venus: 1.2, mars: 1.5 } as const;

/** (C2에 없음 — Claude 출발값) 일식·월식: 출생 행성·축과 합/충 3° 안이면 그 대상 가중치를 곱한다. */
export const ECLIPSE_BASE = 2;
export const ECLIPSE_NATAL_ORB = 3;

/** 빠른 행성(수성·금성·화성) 트랜짓 오브 — 연말 파트에만 쓴다. */
export const FAST_TRANSIT_ORB = 1; // W_026
export const FAST_TRANSIT_PLANETS = ["mars", "venus", "mercury"] as const;

/**
 * 같은 (트랜짓·대상·각도)가 역행 때문에 여러 번 지나면 한 이벤트로 묶는다(마스터스펙 7-1).
 * 앞 구간이 끝나고 이 일수 안에 다시 들어오면 같은 이벤트로 본다.
 */
export const MERGE_GAP_DAYS = { slow: 400, fast: 120 } as const; // (C2에 없음 — Claude 출발값)

/** 기간별로 해석에 쓰는 이벤트 수. 연말 3(W_029), 2027 5(W_030), 2026은 C2에 없어 5(Claude 출발값).
 *  5년은 개수가 아니라 '연도별 최고점 1개 + 나이 마일스톤'(W_031, timeline.ts selectPeriods). */
export const TOP_EVENTS = { year2026: 5, eoy: 3, year2027: 5 } as const;

/** 바람 지원도(5-2) — 요인 하나가 그해에 걸치면 아래 점수를 한 번 더한다. W_035~W_039 */
export const WISH_SCORE = {
  jupiterHousePass: 3, // × 그해 통과 일수 비율
  jupiterHarmony: 2, // 바람 행성·축에 목성 삼분·육분
  saturnHarmony: 1.5, // 토성 삼분·육분
  saturnHard: -3, // 토성 합·사각·충
  plutoHard: -2.5, // 명왕성 합·사각·충
} as const;

/** 판정: 지원도 ≥ +2 순풍, ≤ −2 역풍, 그 사이 보통 — W_040~W_042 */
export const WISH_THRESHOLD = 2;

/**
 * '안정' 바람에 출생 달을 포함할지 — 상담사 검토 대기(마스터스펙 8-3). 04_데이터.json의 매핑은
 * 달을 넣지 않았고(기본 false), 샘플 리포트는 달 긴장까지 반영했다. owner 결정 후 바꾼다.
 */
export const STABILITY_INCLUDES_MOON = false;

/**
 * '연말' 파트 기간. 11월 안 출시가 늦어지면 '2027 상반기'로 바꾸는 설정값(마스터스펙 8-2).
 * "eoy": 테스트한 날 ~ 2026-12-31, "h1_2027": 2027-01-01 ~ 2027-06-30
 */
export const EOY_MODE: "eoy" | "h1_2027" = "eoy";
