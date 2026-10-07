import { NextRequest, NextResponse } from "next/server";
import { computeBirth } from "@/lib/astro/birth";
import type { CalibrationTable } from "@/lib/astro/character";
import { parseBirthRequest } from "@/lib/astro/validate";
import { placeFromCityId } from "@/lib/astro/cityData";
import calibration from "@/data/astro/calibration.json";

// 출생정보 → 출생차트·캐릭터·기간 이벤트. 모든 천문 계산은 서버에서만 한다(마스터스펙 3장).
// 화면 5(질문 3개)를 보는 동안 백그라운드로 부를 수 있도록 로그인 없이 동작하고,
// 아무것도 저장하지 않는다 — 출생일시·출생지는 민감정보라 저장은 동의·로그인 이후 단계에서만 한다.
// 로그에도 입력값을 남기지 않는다.
export const runtime = "nodejs";

const ref = calibration as CalibrationTable;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const parsed = parseBirthRequest(body, { findCity: placeFromCityId });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    return NextResponse.json(computeBirth(parsed.input, ref));
  } catch (e) {
    if (e instanceof RangeError) return NextResponse.json({ error: "고른 시간을 다시 확인해 주세요." }, { status: 400 });
    console.error("출생차트 계산 실패:", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({ error: "계산 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
