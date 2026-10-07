// 도시 목록(약 3.9MB)을 서버에서 한 번만 읽어 둔다. 브라우저 번들에는 들어가지 않는다.
import "server-only";
import cities from "@/data/astro/cities.json";
import { findCityById, type CityRow } from "./cities";
import type { Place } from "./places";

export const CITY_ROWS = cities as unknown as CityRow[];

export function placeFromCityId(id: number): Place | null {
  const c = findCityById(CITY_ROWS, id);
  return c ? { label: c.label, lat: c.lat, lng: c.lng, timeZone: c.timeZone } : null;
}
