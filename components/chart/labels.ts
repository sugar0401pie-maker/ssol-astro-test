// 출생차트 화면에서 쓰는 이름·기호. 기호 뒤의 U+FE0E(텍스트 표현 선택자)는 iOS가
// ♈ 같은 문자를 컬러 이모지로 바꿔 그리지 않게 한다.
import type { PointKey } from "@/lib/astro/constants";
import type { SignName } from "@/lib/astro/wheelLayout";

const TEXT = "︎";

export const POINT_NAMES: Record<PointKey, string> = {
  sun: "태양",
  moon: "달",
  mercury: "수성",
  venus: "금성",
  mars: "화성",
  jupiter: "목성",
  saturn: "토성",
  uranus: "천왕성",
  neptune: "해왕성",
  pluto: "명왕성",
  asc: "상승궁",
  mc: "천정",
};

export const PLANET_GLYPHS: Partial<Record<PointKey, string>> = {
  sun: "☉" + TEXT,
  moon: "☽" + TEXT,
  mercury: "☿" + TEXT,
  venus: "♀" + TEXT,
  mars: "♂" + TEXT,
  jupiter: "♃" + TEXT,
  saturn: "♄" + TEXT,
  uranus: "♅" + TEXT,
  neptune: "♆" + TEXT,
  pluto: "♇" + TEXT,
};

/** 표·휠에 그리는 순서. */
export const PLANET_ORDER: readonly PointKey[] = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
];

/** 양자리(♈ U+2648)부터 물고기자리(♓ U+2653)까지. 인덱스 = 별자리 순서. */
export const SIGN_GLYPHS: readonly string[] = Array.from({ length: 12 }, (_, i) => String.fromCodePoint(0x2648 + i) + TEXT);

export type WheelSelection = { kind: "planet"; key: PointKey } | { kind: "sign"; key: SignName } | { kind: "line"; key: string };
