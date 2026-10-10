// 해외 출생지 도시 검색(마스터스펙 6-1). 데이터는 GeoNames cities15000을 scripts/build_cities.py로 줄인
// data/astro/cities.json — 서버가 직접 읽어 검색하므로 사용자 입력이 외부로 나가지 않는다.
// 표시는 "도시, 국가"(예: "로스앤젤레스, 미국"), 한글·영문 검색 모두 지원.

export const CITY_ATTRIBUTION = "도시 데이터: GeoNames (CC BY 4.0)";

/** [geonameid, 영문이름, 한글이름, 국가코드, 위도, 경도, 시간대, 인구, 검색키("|" 구분)] — 인구 내림차순 */
export type CityRow = [number, string, string, string, number, number, string, number, string];

export interface CityResult {
  id: number;
  label: string;
  /** 목록 한 줄(프로토타입 "도쿄, 일본 (Tokyo)")·선택 줄("선택: 도쿄 (Tokyo) · UTC+9")용 */
  name: string;
  country: string;
  en: string;
  lat: number;
  lng: number;
  timeZone: string;
}

const hasHangul = (s: string) => /[가-힣]/.test(s);

export function normalizeQuery(q: string): string {
  if (hasHangul(q)) return q.replace(/[\s\-·]/g, "");
  return q
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

let countryNames: Intl.DisplayNames | null = null;
function countryKo(cc: string): string {
  try {
    countryNames ??= new Intl.DisplayNames(["ko"], { type: "region" });
    return countryNames.of(cc) ?? cc;
  } catch {
    return cc;
  }
}

export function toResult(r: CityRow): CityResult {
  const name = r[2] || r[1];
  const country = countryKo(r[3]);
  return { id: r[0], label: `${name}, ${country}`, name, country, en: r[1], lat: r[4], lng: r[5], timeZone: r[6] };
}

/** 표준시 기준 UTC 차이 글자("UTC+9", "UTC-5", "UTC+5.5"). 1월 1일 기준이라 서머타임은 빼고 보여 준다. */
export function utcOffsetLabel(timeZone: string): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(new Date(Date.UTC(2026, 0, 1, 12)))
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const m = part.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return "UTC+0";
    const v = Number(m[2]) + (m[3] ? Number(m[3]) / 60 : 0);
    return `UTC${m[1]}${Number.isInteger(v) ? v : v.toFixed(1)}`;
  } catch {
    return "UTC";
  }
}

/**
 * 앞부분 일치 먼저, 그다음 중간 일치. 같은 단계 안에서는 인구 순(행이 이미 인구 내림차순).
 * 너무 짧은 검색어(한글 1자 미만·영문 2자 미만)는 빈 결과.
 */
export function searchCities(rows: CityRow[], query: string, limit = 10): CityResult[] {
  const q = normalizeQuery(query.slice(0, 40));
  if (!q || (!hasHangul(q) && q.length < 2)) return [];
  const prefix: CityRow[] = [];
  const contains: CityRow[] = [];
  for (const r of rows) {
    const keys = r[8].split("|");
    if (keys.some((k) => k.startsWith(q))) prefix.push(r);
    else if (prefix.length < limit && keys.some((k) => k.includes(q))) contains.push(r);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...contains].slice(0, limit).map(toResult);
}

export function findCityById(rows: CityRow[], id: number): CityResult | null {
  const r = rows.find((x) => x[0] === id);
  return r ? toResult(r) : null;
}
