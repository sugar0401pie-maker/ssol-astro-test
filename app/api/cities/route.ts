import { NextRequest, NextResponse } from "next/server";
import { searchCities, utcOffsetLabel } from "@/lib/astro/cities";
import { CITY_ROWS, CITY_ROWS_EN } from "@/lib/astro/cityData";

// 해외 출생지 자동완성. 검색은 서버 안에서만 하고(외부 API 없음) 검색어는 로그에 남기지 않는다.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 40);
  // ?lang=en: 영문판 목록(한국 도시 포함, 영문 표시)
  const rows = req.nextUrl.searchParams.get("lang") === "en" ? CITY_ROWS_EN : CITY_ROWS;
  return NextResponse.json({ results: searchCities(rows, q, 8).map(({ id, label, name, country, en, timeZone }) => ({ id, label, name, country, en, utc: utcOffsetLabel(timeZone) })) });
}
