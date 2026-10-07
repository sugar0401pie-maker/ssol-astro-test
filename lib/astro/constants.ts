// 점성술 엔진 상수. 값은 docs/spec/04_데이터.json과 docs/reference/07_엔진_프로토타입.py를 그대로
// 옮긴 것이다 — 이 파일을 바꾸면 캐릭터 분포가 달라지므로 scripts/gen_fixtures.py로 보정표와
// 테스트 기준값을 다시 만들고 분포를 재확인해야 한다(마스터스펙 6-3).
import { Body } from "astronomy-engine";

export const BODIES = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
} as const;

export type PlanetKey = keyof typeof BODIES;
export type PointKey = PlanetKey | "asc" | "mc";
export const PLANET_KEYS = Object.keys(BODIES) as PlanetKey[];

export const SIGNS = [
  "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
  "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리",
] as const;

// 양자리부터 불·흙·공기·물 순환.
export const ELEMENTS = ["불", "흙", "공기", "물"] as const;
export type Element = (typeof ELEMENTS)[number];

export const STYLE_BY_ELEMENT: Record<Element, Style> = {
  불: "다가가기",
  물: "맞춰주기",
  공기: "거리두기",
  흙: "조율하기",
};

export const STYLES = ["다가가기", "맞춰주기", "거리두기", "조율하기"] as const;
export type Style = (typeof STYLES)[number];

// 역량 행성 순서는 동점일 때 정렬 순서를 정하므로 프로토타입과 같아야 한다.
export const COMPETENCY_BY_PLANET = {
  moon: "기대기",
  saturn: "믿기",
  mars: "선 지키기",
  mercury: "말하기",
  venus: "회복하기",
} as const;
export type CompetencyPlanet = keyof typeof COMPETENCY_BY_PLANET;
export type Competency = (typeof COMPETENCY_BY_PLANET)[CompetencyPlanet];
export const COMPETENCY_PLANETS = Object.keys(COMPETENCY_BY_PLANET) as CompetencyPlanet[];

export const CHARACTER_GRID: Record<Competency, readonly [string, string, string, string]> = {
  기대기: ["수달", "해달", "물범", "비버"],
  믿기: ["원앙", "펭귄", "왜가리", "백조"],
  "선 지키기": ["복어", "소라게", "거북", "조개"],
  말하기: ["물개", "돌고래", "혹등고래", "개구리"],
  회복하기: ["문어", "해파리", "가오리", "불가사리"],
};

export const MALEFICS: ReadonlySet<PlanetKey> = new Set(["mars", "saturn", "uranus", "neptune", "pluto"]);
export const BENEFICS: ReadonlySet<PlanetKey> = new Set(["jupiter", "venus"]);

export const ELEMENT_WEIGHTS: Partial<Record<PlanetKey, number>> = {
  sun: 3, moon: 3, mercury: 2, venus: 2, mars: 2, jupiter: 1, saturn: 1,
};

// 키 순서(0, 60, 90, 120, 180)가 출력 순서다.
export const ASPECTS: ReadonlyArray<readonly [number, AspectName]> = [
  [0, "합"], [60, "육분"], [90, "사각"], [120, "삼분"], [180, "충"],
];
export type AspectName = "합" | "육분" | "사각" | "삼분" | "충";

export const NATAL_ORB = 6;
export const STRESS_ORB = 6;
// 1·2위 백분위 차이가 이보다 작으면 사용자 확인 화면(무작위 금지, 마스터스펙 6-3).
export const COMPETENCY_TIE_GAP = 0.03;

export const TRANSIT_PLANETS = ["jupiter", "saturn", "uranus", "neptune", "pluto"] as const;
export type TransitPlanet = (typeof TRANSIT_PLANETS)[number];
export const TRANSIT_ORB: Record<TransitPlanet, number> = {
  jupiter: 2, saturn: 2, uranus: 1.5, neptune: 1.5, pluto: 1.5,
};
export const TRANSIT_TARGETS: ReadonlyArray<PointKey> = ["sun", "moon", "mercury", "venus", "mars", "asc", "mc", "saturn"];

export const STATION_PLANETS = ["mercury", "venus", "mars"] as const;
export const INGRESS_PLANETS = ["jupiter", "saturn", "uranus"] as const;

// 트랜짓을 하루 한 번 재는 시각(UTC 03시 = 한국 정오). 프로토타입과 같다.
export const DAILY_SAMPLE_UTC_HOUR = 3;

export function signIndex(lon: number): number {
  return Math.floor(lon / 30);
}

export function elementOf(lon: number): Element {
  return ELEMENTS[signIndex(lon) % 4];
}
