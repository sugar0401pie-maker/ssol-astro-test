// 한국 17개 시·도 대표 좌표(시청·도청 소재지 근사, docs/spec/04_데이터.json). 시간대는 Asia/Seoul.
// 해외 도시는 GeoNames cities15000을 우리 DB에 적재해 검색할 예정(아직 미구현, 마스터스펙 6-1).
export const KOREA_TIME_ZONE = "Asia/Seoul";

export const KOREA_REGIONS = [
  ["서울", 37.5663, 126.9779],
  ["부산", 35.1798, 129.075],
  ["대구", 35.8714, 128.6014],
  ["인천", 37.4563, 126.7052],
  ["광주", 35.1601, 126.8514],
  ["대전", 36.3504, 127.3845],
  ["울산", 35.5384, 129.3114],
  ["세종", 36.4801, 127.289],
  ["경기", 37.2893, 127.0535],
  ["강원", 37.8853, 127.7298],
  ["충북", 36.6357, 127.4913],
  ["충남", 36.6588, 126.6728],
  ["전북", 35.8203, 127.1088],
  ["전남", 34.8161, 126.4629],
  ["경북", 36.576, 128.5056],
  ["경남", 35.2383, 128.6924],
  ["제주", 33.489, 126.4983],
] as const;

export type KoreaRegion = (typeof KOREA_REGIONS)[number][0];

export interface Place {
  label: string;
  lat: number;
  lng: number;
  timeZone: string;
}

export function koreaRegion(name: string): Place | null {
  const row = KOREA_REGIONS.find(([n]) => n === name);
  return row ? { label: row[0], lat: row[1], lng: row[2], timeZone: KOREA_TIME_ZONE } : null;
}
