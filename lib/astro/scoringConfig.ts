// 이벤트 점수·바람 지원도 가중치 — ⚠ 모두 임시 초안(마스터스펙 3-2: "가중치 초안은 별도 설정 파일로
// 두고, 파일럿 후 조정한다"). 스펙에 정해진 값은 예시 '토성 3 × 태양 3 × 합 1.0 = 9점', Q1 관련도 ×1.5,
// 기간별 상위 3~5개뿐이다. 나머지 숫자는 이 예시와 같은 크기 감각으로 Claude가 정한 출발값이며
// 파일럿 결과로 바꿔야 한다. 값을 바꿀 때 코드를 고칠 필요는 없다.
import type { AspectName, PlanetKey, PointKey } from "./constants.ts";

export const PLANET_WEIGHT: Partial<Record<PlanetKey, number>> = {
  pluto: 3, neptune: 3, uranus: 3, saturn: 3, jupiter: 2, mars: 1.5, venus: 1, mercury: 1,
};

export const TARGET_WEIGHT: Partial<Record<PointKey, number>> = {
  sun: 3, moon: 3, asc: 3, mc: 2.5, saturn: 3, jupiter: 2, uranus: 2, neptune: 2, mercury: 1.5, venus: 1.5, mars: 1.5,
};

export const ASPECT_WEIGHT: Record<AspectName, number> = {
  합: 1.0, 충: 0.9, 사각: 0.9, 삼분: 0.7, 육분: 0.5,
};

/** 기간 안에 들어오는 일수로 보정. 짧게 스치는 각도보다 오래 머무는 각도를 조금 더 크게 본다. */
export function durationFactor(daysInWindow: number): number {
  if (daysInWindow >= 60) return 1.0;
  if (daysInWindow >= 15) return 0.9;
  return 0.8;
}

/** 스펙 5-1: Q1 고민 영역을 건드리는 이벤트 가산. (스펙 확정값) */
export const DOMAIN_BOOST = 1.5;

/** 역행 이벤트 점수 = 행성 가중치 × 이 값 (화면에선 하우스와 함께 쓰임) */
export const STATION_BASE = 3;
export const STATION_PLANET_WEIGHT = { mercury: 1, venus: 1.2, mars: 1.5 } as const;

/** 일식·월식: 출생 행성·축과 합/충 3° 안이면 그 대상 가중치를 곱한다. */
export const ECLIPSE_BASE = 2;
export const ECLIPSE_NATAL_ORB = 3;

/** 빠른 행성(수성·금성·화성) 트랜짓 오브 — 연말 파트에만 쓴다. */
export const FAST_TRANSIT_ORB = 1;
export const FAST_TRANSIT_PLANETS = ["mars", "venus", "mercury"] as const;

/**
 * 같은 (트랜짓·대상·각도)가 역행 때문에 여러 번 지나면 한 이벤트로 묶는다(마스터스펙 7-1).
 * 앞 구간이 끝나고 이 일수 안에 다시 들어오면 같은 이벤트로 본다.
 */
export const MERGE_GAP_DAYS = { slow: 400, fast: 120 } as const;

/** 기간별로 해석에 쓰는 이벤트 수(스펙: 상위 3~5개). */
export const TOP_EVENTS = { year2026: 5, eoy: 3, year2027: 5, fiveYears: 5 } as const;

/** 바람 지원도(5-2): 연도별 합계가 +이 값 이상이면 순풍, −이 값 이하면 역풍. 기준값은 파일럿으로 정한다. */
export const WISH_THRESHOLD = 3;
/** 목성이 바람 하우스를 1년 내내 지날 때의 가점, 토성·명왕성이 지날 때의 감점(일수 비율로 곱함). */
export const WISH_HOUSE_SUPPORT = 6;
export const WISH_HOUSE_BLOCK = 3;

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
