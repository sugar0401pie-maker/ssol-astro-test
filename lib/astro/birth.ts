// 입력(생년월일·시간·출생지) → 출생차트 + 캐릭터 + 기간 이벤트. 정확도 등급(마스터스펙 6-1 '화면 4 입력 규칙'):
//   A  시·분 입력 → 상승궁·하우스 모두 사용
//   B  시간대(새벽/오전/오후/저녁) → 구간 안 30분 간격으로 캐릭터 계산, 하나로 모이면 그대로,
//      갈리면 후보 2~3개를 사용자가 고른다(무작위 선택 금지)
//   C  모름 → 12:00 기준, 상승궁·하우스 미사용, 하루 전체 30분 간격에서 가장 오래 나오는 후보 2~3개
import { judgeCharacter, type CalibrationTable, type CharacterResult } from "./character.ts";
import { computeNatal, type Accuracy, type Longitudes, type NatalChart } from "./natal.ts";
import { localToUtc, type LocalDateTime } from "./time.ts";
import { computeStationsAndIngress, computeTransits, type Ingress, type Station, type TransitEvent } from "./transits.ts";
import type { Place } from "./places.ts";

export const ENGINE_VERSION = "astro-1.0 (prototype-v2 parity)";

export const TIME_BANDS = {
  dawn: { label: "새벽", startHour: 0 },
  morning: { label: "오전", startHour: 6 },
  afternoon: { label: "오후", startHour: 12 },
  evening: { label: "저녁", startHour: 18 },
} as const;
export type TimeBand = keyof typeof TIME_BANDS;

export type BirthTime =
  | { kind: "exact"; hour: number; minute: number }
  /** pick: 후보 선택 화면에서 고른 후보의 대표 시각("HH:MM", 구간 안이어야 함) */
  | { kind: "band"; band: TimeBand; pick?: string }
  | { kind: "unknown"; pick?: string };

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  time: BirthTime;
  place: Place;
}

export interface CharacterCandidate {
  name: string;
  competency: CharacterResult["competency"];
  style: CharacterResult["style"];
  /** 30분 간격 표본 중 이 캐릭터가 나온 비율 */
  share: number;
  /** 다시 요청할 때 time.pick으로 넘길 현지 시각 */
  pick: string;
}

export interface BirthResult {
  engineVersion: string;
  /** 재계산용 저장값: 현지 시각 + 시간대 ID + UTC (마스터스펙 2장) */
  stored: { local: string; timeZone: string; utc: string; place: Place; time: BirthTime };
  accuracy: Accuracy;
  /** 후보가 갈리면 null — 사용자가 candidates 중 하나를 골라 pick으로 다시 요청한다 */
  resolved: null | {
    chart: NatalChart;
    /** 전체 정밀도 경도(리포트 조립·바람 판정이 다시 쓴다). 화면 표시는 chart.planets를 쓴다. */
    longitudes: Longitudes;
    character: CharacterResult;
    transits: TransitEvent[];
    stations: Station[];
    ingress: Ingress[];
  };
  candidates: CharacterCandidate[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

function parsePick(pick: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(pick);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}

function localAt(input: BirthInput, minutes: number): LocalDateTime {
  return { year: input.year, month: input.month, day: input.day, hour: Math.floor(minutes / 60), minute: minutes % 60 };
}

/** 구간 [start, end) 안 30분 간격 표본으로 캐릭터 후보를 센다. 많이 나온 순, 동률이면 먼저 나온 순. */
export function sampleCandidates(input: BirthInput, startMin: number, endMin: number, ref: CalibrationTable): CharacterCandidate[] {
  const groups = new Map<string, { c: CharacterResult; times: number[] }>();
  let total = 0;
  for (let m = startMin; m < endMin; m += 30) {
    const utc = localToUtc(localAt(input, m), input.place.timeZone);
    const { chart, L } = computeNatal(utc, input.place.lat, input.place.lng, false);
    const c = judgeCharacter(L, chart.elements, ref);
    const g = groups.get(c.name) ?? { c, times: [] };
    g.times.push(m);
    groups.set(c.name, g);
    total++;
  }
  return [...groups.values()]
    .sort((a, b) => b.times.length - a.times.length)
    .map(({ c, times }) => ({
      name: c.name,
      competency: c.competency,
      style: c.style,
      share: Math.round((times.length / total) * 100) / 100,
      // 그 캐릭터가 나온 표본의 가운데 시각을 대표로 쓴다.
      pick: hhmm(times[Math.floor(times.length / 2)]),
    }));
}

export interface PeriodOptions {
  start: string;
  end: string;
}

export const DEFAULT_PERIOD: PeriodOptions = { start: "2026-01-01", end: "2031-12-31" };

export function computeBirth(input: BirthInput, ref: CalibrationTable, period: PeriodOptions = DEFAULT_PERIOD): BirthResult {
  const { time } = input;
  let minutes: number;
  let accuracy: Accuracy;
  let candidates: CharacterCandidate[] = [];

  if (time.kind === "exact") {
    minutes = time.hour * 60 + time.minute;
    accuracy = "A";
  } else if (time.kind === "band") {
    const start = TIME_BANDS[time.band].startHour * 60;
    const end = start + 6 * 60;
    accuracy = "B";
    candidates = sampleCandidates(input, start, end, ref).slice(0, 3);
    const picked = time.pick === undefined ? null : parsePick(time.pick);
    if (time.pick !== undefined && (picked === null || picked < start || picked >= end)) {
      throw new RangeError("pick이 고른 시간대 밖이에요");
    }
    if (picked !== null) minutes = picked;
    else if (candidates.length === 1) minutes = parsePick(candidates[0].pick)!;
    else return unresolved(input, start, accuracy, candidates);
  } else {
    accuracy = "C";
    candidates = sampleCandidates(input, 0, 24 * 60, ref).slice(0, 3);
    const picked = time.pick === undefined ? null : parsePick(time.pick);
    if (time.pick !== undefined && picked === null) throw new RangeError("pick 형식이 올바르지 않아요");
    // 차트(행성 위치)는 12:00 기준. 캐릭터만 고른 후보 시각으로 판정한다.
    if (picked === null && candidates.length > 1) return unresolved(input, 12 * 60, accuracy, candidates);
    minutes = 12 * 60;
    const chosen = picked ?? parsePick(candidates[0].pick)!;
    return resolve(input, minutes, accuracy, candidates, ref, period, chosen);
  }
  return resolve(input, minutes, accuracy, candidates, ref, period, minutes);
}

function stored(input: BirthInput, minutes: number) {
  const local = localAt(input, minutes);
  const utc = localToUtc(local, input.place.timeZone);
  return {
    local: `${input.year}-${pad(input.month)}-${pad(input.day)}T${hhmm(minutes)}`,
    timeZone: input.place.timeZone,
    utc: utc.toISOString(),
    place: input.place,
    time: input.time,
    utcDate: utc,
  };
}

function unresolved(input: BirthInput, minutes: number, accuracy: Accuracy, candidates: CharacterCandidate[]): BirthResult {
  const { utcDate: _u, ...s } = stored(input, minutes);
  void _u;
  return { engineVersion: ENGINE_VERSION, stored: s, accuracy, resolved: null, candidates };
}

function resolve(
  input: BirthInput,
  chartMinutes: number,
  accuracy: Accuracy,
  candidates: CharacterCandidate[],
  ref: CalibrationTable,
  period: PeriodOptions,
  characterMinutes: number,
): BirthResult {
  const { utcDate, ...s } = stored(input, chartMinutes);
  const withTime = accuracy !== "C";
  const { chart, L } = computeNatal(utcDate, input.place.lat, input.place.lng, withTime, accuracy === "B" ? "B" : "A");
  let character: CharacterResult;
  if (characterMinutes === chartMinutes) {
    character = judgeCharacter(L, chart.elements, ref);
  } else {
    const cu = localToUtc(localAt(input, characterMinutes), input.place.timeZone);
    const c = computeNatal(cu, input.place.lat, input.place.lng, false);
    character = judgeCharacter(c.L, c.chart.elements, ref);
  }
  return {
    engineVersion: ENGINE_VERSION,
    stored: s,
    accuracy,
    resolved: {
      chart,
      longitudes: L,
      character,
      transits: computeTransits(L, period.start, period.end),
      ...computeStationsAndIngress(L, period.start, period.end),
    },
    candidates,
  };
}
