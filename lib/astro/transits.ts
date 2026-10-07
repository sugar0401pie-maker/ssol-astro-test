// 트랜짓·역행·별자리 이동 추출(마스터스펙 3-2, 7-1). 하루 간격(한국 정오)으로 훑는다.
// 정확일은 ±1일 오차가 있다 — 화면·리포트에 시간 단위가 필요해지면 이분법으로 좁힌다.
// 날짜는 'YYYY-MM-DD' 문자열로 돌려주고, 글자로 바꾸는 건 서버 포맷 함수가 맡는다(AI는 토큰만 받음).
import {
  ASPECTS, DAILY_SAMPLE_UTC_HOUR, INGRESS_PLANETS, SIGNS, STATION_PLANETS, TRANSIT_ORB,
  TRANSIT_PLANETS, TRANSIT_TARGETS, signIndex,
  type AspectName, type PointKey, type TransitPlanet,
} from "./constants.ts";
import { houseOf, longitude, sep, timeOf, type Longitudes } from "./natal.ts";

export interface TransitEvent {
  transit: TransitPlanet;
  target: PointKey;
  aspect: AspectName;
  from: string;
  to: string;
  exact: string;
  saturn_return: boolean;
}

export interface Station {
  planet: (typeof STATION_PLANETS)[number];
  type: "역행 시작" | "순행 시작";
  date: string;
  sign: (typeof SIGNS)[number];
  house: number | null;
}

export interface Ingress {
  planet: (typeof INGRESS_PLANETS)[number];
  date: string;
  sign: (typeof SIGNS)[number];
  house: number | null;
}

const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' 두 날짜 사이(양끝 포함)의 날짜 목록. */
export function dailyRange(start: string, end: string): string[] {
  const out: string[] = [];
  const endMs = Date.parse(`${end}T00:00:00Z`);
  for (let ms = Date.parse(`${start}T00:00:00Z`); ms <= endMs; ms += DAY_MS) {
    out.push(new Date(ms).toISOString().slice(0, 10));
  }
  return out;
}

function sampleTime(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCHours(DAILY_SAMPLE_UTC_HOUR);
  return timeOf(d);
}

export function computeTransits(L: Longitudes, start: string, end: string): TransitEvent[] {
  const days = dailyRange(start, end);
  const pos = {} as Record<TransitPlanet, number[]>;
  for (const k of TRANSIT_PLANETS) pos[k] = days.map((d) => longitude(k, sampleTime(d)));

  const events: TransitEvent[] = [];
  for (const k of TRANSIT_PLANETS) {
    for (const g of TRANSIT_TARGETS) {
      const target = L[g];
      if (target === undefined) continue; // C등급이면 ASC·MC 없음
      for (const [ang, name] of ASPECTS) {
        if (g === "saturn" && !(k === "saturn" && ang === 0)) continue; // 출생 토성은 토성 리턴(합)만
        let run: { from: string; to: string; exact: string; orb: number } | null = null;
        const push = () => {
          if (!run) return;
          events.push({ transit: k, target: g, aspect: name, from: run.from, to: run.to, exact: run.exact, saturn_return: g === "saturn" });
          run = null;
        };
        days.forEach((d, i) => {
          const o = Math.abs(sep(pos[k][i], target) - ang);
          if (o <= TRANSIT_ORB[k]) {
            if (!run) run = { from: d, to: d, exact: d, orb: o };
            run.to = d;
            if (o < run.orb) {
              run.orb = o;
              run.exact = d;
            }
          } else {
            push();
          }
        });
        push();
      }
    }
  }
  // 안정 정렬이라 같은 시작일이면 생성 순서를 유지한다(프로토타입과 동일).
  return events.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

export function computeStationsAndIngress(L: Longitudes, start: string, end: string): { stations: Station[]; ingress: Ingress[] } {
  const asc = L.asc;
  const house = (lon: number) => (asc === undefined ? null : houseOf(lon, asc));
  const days = dailyRange(start, end);
  const stations: Station[] = [];
  for (const planet of STATION_PLANETS) {
    let prev: boolean | null = null;
    for (const d of days) {
      const t = sampleTime(d);
      const a = longitude(planet, t.AddDays(-1));
      const c = longitude(planet, t.AddDays(1));
      const direct = ((c - a + 540) % 360) - 180 > 0;
      if (prev !== null && direct !== prev) {
        const x = longitude(planet, t);
        stations.push({ planet, type: direct ? "순행 시작" : "역행 시작", date: d, sign: SIGNS[signIndex(x)], house: house(x) });
      }
      prev = direct;
    }
  }
  const ingress: Ingress[] = [];
  for (const planet of INGRESS_PLANETS) {
    let prev: number | null = null;
    for (const d of days) {
      const x = longitude(planet, sampleTime(d));
      const s = signIndex(x);
      if (s !== prev) {
        ingress.push({ planet, date: d, sign: SIGNS[s], house: house(x) });
        prev = s;
      }
    }
  }
  return { stations, ingress };
}
