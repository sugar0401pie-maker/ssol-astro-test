// 출생차트 계산: 10행성 경도·별자리·홀사인 하우스, ASC·MC, 주요 각도, 4원소 점수.
// docs/reference/07_엔진_프로토타입.py의 natal()과 같은 결과를 내야 한다(test/fixtures로 검증).
// 서버에서만 부른다 — AI는 계산하지 않고 이 결과만 해석한다(마스터스펙 3장).
import { Ecliptic, GeoVector, SiderealTime, MakeTime, type AstroTime } from "astronomy-engine";
import {
  ASPECTS, BODIES, ELEMENT_WEIGHTS, ELEMENTS, NATAL_ORB, PLANET_KEYS, SIGNS,
  elementOf, signIndex, type AspectName, type Element, type PlanetKey, type PointKey,
} from "./constants.ts";

export type Longitudes = Partial<Record<PointKey, number>> & Record<PlanetKey, number>;

export type Accuracy = "A" | "B" | "C";

export interface PlacedPoint {
  lon: number;
  sign: (typeof SIGNS)[number];
  deg: number;
  house?: number;
}

export interface NatalAspect {
  a: PointKey;
  b: PointKey;
  aspect: AspectName;
  orb: number;
}

export interface NatalChart {
  planets: Partial<Record<PointKey, PlacedPoint>>;
  accuracy: Accuracy;
  aspects: NatalAspect[];
  elements: Record<Element, number>;
}

/** 파이썬 round(x, n)과 같게 반올림(정확히 .5인 경우는 사실상 없어 toFixed로 충분). */
export function round(x: number, digits: number): number {
  return Number(x.toFixed(digits));
}

export function sep(a: number, b: number): number {
  const d = ((Math.abs(a - b) % 360) + 360) % 360;
  return Math.min(d, 360 - d);
}

export function timeOf(utc: Date): AstroTime {
  return MakeTime(utc);
}

export function longitude(key: PlanetKey, t: AstroTime): number {
  return Ecliptic(GeoVector(BODIES[key], t, true)).elon;
}

export function planetLongitudes(t: AstroTime): Record<PlanetKey, number> {
  const out = {} as Record<PlanetKey, number>;
  for (const k of PLANET_KEYS) out[k] = longitude(k, t);
  return out;
}

/** 상승궁·천정. 프로토타입의 공식(평균 황도경사 근사 포함)을 그대로 쓴다. */
export function ascMc(utc: Date, t: AstroTime, lat: number, lng: number): { asc: number; mc: number } {
  const lst = (((SiderealTime(t) + lng / 15) % 24) + 24) % 24;
  const ramc = (lst * 15 * Math.PI) / 180;
  const eps = ((23.4393 - 0.013 * ((utc.getUTCFullYear() - 2000) / 100)) * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const deg = (r: number) => ((((r * 180) / Math.PI) % 360) + 360) % 360;
  const asc = deg(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))));
  const mc = deg(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)));
  return { asc, mc };
}

/** 출생 순간 역행 중인 행성(태양·달 제외) — 프로토타입 computeChart와 같은 계산(±12시간 경도 차). */
export function retrogradeAt(utc: Date): PlanetKey[] {
  const t = timeOf(utc);
  return PLANET_KEYS.filter((k) => {
    if (k === "sun" || k === "moon") return false;
    const a = longitude(k, t.AddDays(-0.5));
    const c = longitude(k, t.AddDays(0.5));
    return ((c - a + 540) % 360) - 180 < 0;
  });
}

export function houseOf(lon: number, ascLon: number): number {
  // 홀사인: 상승궁이 있는 별자리 전체가 1하우스.
  return (((signIndex(lon) - signIndex(ascLon)) % 12) + 12) % 12 + 1;
}

export function elementScores(L: Record<PlanetKey, number>): Record<Element, number> {
  const out = Object.fromEntries(ELEMENTS.map((e) => [e, 0])) as Record<Element, number>;
  for (const [k, w] of Object.entries(ELEMENT_WEIGHTS) as [PlanetKey, number][]) {
    out[elementOf(L[k])] += w;
  }
  return out;
}

/**
 * withTime=false면 C등급: 상승궁·하우스를 계산하지 않는다(출생시간을 모르면 하우스가 무의미).
 * accuracyIfTimed는 시간대 선택(B)과 정확한 시간(A)을 구분하려고 받는다.
 */
export function computeNatal(
  utc: Date,
  lat: number,
  lng: number,
  withTime = true,
  accuracyIfTimed: Exclude<Accuracy, "C"> = "A",
): { chart: NatalChart; L: Longitudes } {
  const t = timeOf(utc);
  const L: Longitudes = planetLongitudes(t);
  if (withTime) Object.assign(L, ascMc(utc, t, lat, lng));

  const planets: NatalChart["planets"] = {};
  const keys = Object.keys(L) as PointKey[];
  for (const k of keys) {
    const v = L[k] as number;
    const p: PlacedPoint = { lon: round(v, 2), sign: SIGNS[signIndex(v)], deg: round(v % 30, 1) };
    if (withTime) p.house = houseOf(v, L.asc as number);
    planets[k] = p;
  }

  const aspects: NatalAspect[] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i];
      const b = keys[j];
      if ((a === "asc" && b === "mc") || (a === "mc" && b === "asc")) continue;
      const d = sep(L[a] as number, L[b] as number);
      for (const [ang, name] of ASPECTS) {
        if (Math.abs(d - ang) < NATAL_ORB) aspects.push({ a, b, aspect: name, orb: round(Math.abs(d - ang), 1) });
      }
    }
  }

  return {
    chart: { planets, accuracy: withTime ? accuracyIfTimed : "C", aspects, elements: elementScores(L) },
    L,
  };
}
