// 연말(11·12월) 보강용 계산(owner 2026-11-02, 해석 DB 초안 v0.3 A10p·A10s·A19).
// ① 역행 뒤 정리: 순행으로 돌아선 뒤, 역행을 시작한 자리(경도)로 다시 돌아오기까지
// ② 역행 앞 준비: 나중에 순행으로 돌아설 자리(경도)에 처음 닿은 날부터 역행 시작 전까지
// ③ 초승달·보름달: 날짜(한국 날짜)와 달의 경도.
// 역행 날짜 자체는 엔진(timeline.ts — 하루 표본, 파이썬 프로토타입과 같은 결과)이 정한 값을 받아 쓴다.
import { SearchMoonQuarter, MakeTime } from "astronomy-engine";
import type { PlanetKey } from "./constants.ts";
import { longitude } from "./natal.ts";
import { sampleTime } from "./transits.ts";

const DAY_MS = 86_400_000;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
/** a에서 b까지 앞으로 잰 차이(-180~180] — 0 이상이면 b가 a에 닿았거나 지났다 */
const ahead = (lon: number, target: number) => {
  const d = (((lon - target) % 360) + 540) % 360 - 180;
  return d;
};

/** 역행 뒤 정리가 끝나는 날: 순행 시작(rxEnd) 다음 날부터 하루씩, 역행 시작 날의 경도에 다시 닿는 첫날 */
export function postShadowEnd(planet: PlanetKey, rxStart: string, rxEnd: string, maxDays = 120): string | null {
  const target = longitude(planet, sampleTime(rxStart));
  for (let i = 1; i <= maxDays; i++) {
    const d = addDays(rxEnd, i);
    if (ahead(longitude(planet, sampleTime(d)), target) >= 0) return d;
  }
  return null;
}

/** 역행 앞 준비가 시작되는 날: 순행으로 돌아설 날(rxEnd)의 경도에 역행 전 처음 닿는 날 */
export function preShadowStart(planet: PlanetKey, rxStart: string, rxEnd: string, maxDays = 150): string | null {
  const target = longitude(planet, sampleTime(rxEnd));
  let first: string | null = null;
  for (let i = 1; i <= maxDays; i++) {
    const d = addDays(rxStart, -i);
    if (ahead(longitude(planet, sampleTime(d)), target) >= 0) first = d;
    else break;
  }
  return first;
}

export interface Lunation {
  kind: "new" | "full";
  /** 한국 날짜 YYYY-MM-DD */
  date: string;
  /** 달의 황경 */
  lon: number;
}

/** start~end(한국 날짜, 양끝 포함) 사이의 초승달(삭)·보름달(망) */
export function lunations(start: string, end: string): Lunation[] {
  const out: Lunation[] = [];
  let t = MakeTime(new Date(Date.parse(`${start}T00:00:00+09:00`) - 2 * DAY_MS));
  for (let i = 0; i < 20; i++) {
    const q = SearchMoonQuarter(t);
    const kst = new Date(q.time.date.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
    if (kst > end) break;
    if ((q.quarter === 0 || q.quarter === 2) && kst >= start) out.push({ kind: q.quarter === 0 ? "new" : "full", date: kst, lon: longitude("moon", q.time) });
    t = q.time.AddDays(1);
  }
  return out;
}
