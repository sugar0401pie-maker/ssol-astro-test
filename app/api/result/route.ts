import { NextRequest, NextResponse } from "next/server";
import { isAnswers } from "@/lib/astro/answers";
import { computeBirth } from "@/lib/astro/birth";
import type { CalibrationTable } from "@/lib/astro/character";
import { parseBirthRequest } from "@/lib/astro/validate";
import { placeFromCityId } from "@/lib/astro/cityData";
import { buildFreeResult } from "@/lib/report/freeResult";
import calibration from "@/data/astro/calibration.json";

// 출생정보 + 질문 3개 답 → 무료 결과(1~3번 섹션) 데이터. AI 호출 없음, 저장 없음.
// 시간대(B)·모름(C)에서 캐릭터 후보가 갈리면 결과 대신 후보를 돌려주고, 화면이 고른 후보(pick)로 다시 부른다.
// 유료 섹션 본문은 결제 후 서버에서 따로 만든다(이 응답에는 제목만).
// 로그인 분기(화면 6)는 비로그인 처리 방식이 아직 미정이라 붙이지 않았다(마스터스펙 8-3).
export const runtime = "nodejs";

const ref = calibration as CalibrationTable;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const parsed = parseBirthRequest(body?.birth, { findCity: placeFromCityId });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!isAnswers(body?.answers)) return NextResponse.json({ error: "질문 답을 다시 확인해 주세요." }, { status: 400 });

  try {
    // 무료 결과에는 2026년만 필요하다.
    const birth = computeBirth(parsed.input, ref, { start: "2026-01-01", end: "2026-01-01" });
    if (!birth.resolved) return NextResponse.json({ candidates: birth.candidates, accuracy: birth.accuracy });
    const { chart, longitudes, character } = birth.resolved;
    return NextResponse.json({ result: buildFreeResult({ chart, longitudes, character, answers: body.answers }) });
  } catch (e) {
    if (e instanceof RangeError) return NextResponse.json({ error: "고른 시간을 다시 확인해 주세요." }, { status: 400 });
    console.error("무료 결과 계산 실패:", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({ error: "계산 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
