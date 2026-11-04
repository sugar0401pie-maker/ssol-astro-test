// 도시 목록(약 3.9MB)을 서버에서 한 번만 읽어 둔다. 브라우저 번들에는 들어가지 않는다.
import "server-only";
import cities from "@/data/astro/cities.json";
// 영문판 도시 목록(해외 4,565 + 한국 147, 영문 이름·영문 국가명 — scripts/build_en_cities.py, 2026-11-04)
import citiesEn from "@/data/astro/cities_en.json";
import { findCityById, type CityRow } from "./cities";
import type { Place } from "./places";

export const CITY_ROWS = cities as unknown as CityRow[];

export const CITY_ROWS_EN = citiesEn as unknown as CityRow[];

/** lang "en"이면 영문 목록(표시 "Busan, South Korea"), 아니면 한국어 목록에서 찾는다. 좌표·시간대는 늘 서버 목록 값. */
export function placeFromCityId(id: number, lang?: string): Place | null {
  const c = findCityById(lang === "en" ? CITY_ROWS_EN : CITY_ROWS, id);
  return c ? { label: c.label, lat: c.lat, lng: c.lng, timeZone: c.timeZone } : null;
}
