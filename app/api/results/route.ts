import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromAuthHeader } from "@/lib/supabase/auth";
import { computeFree, parseResultRequest } from "@/lib/results/compute";
import { listResults, saveResult } from "@/lib/results/store";

// POST: 로그인 + 저장 동의 → 서버가 다시 계산해 저장하고 무료 결과를 돌려준다(브라우저가 보낸 계산값은 쓰지 않음).
// GET: 내 결과 목록. 출생 정보·답은 로그에 남기지 않는다.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  // 민감정보 저장은 동의가 있을 때만(마스터스펙 8-1). 화면에서 체크해도 서버가 한 번 더 확인한다.
  if (body?.consent !== true) return NextResponse.json({ error: "결과 저장 동의가 필요해요." }, { status: 400 });
  const parsed = parseResultRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  let computed;
  try {
    computed = computeFree(parsed.input, parsed.answers, parsed.nickname);
  } catch (e) {
    if (e instanceof RangeError) return NextResponse.json({ error: "고른 시간을 다시 확인해 주세요." }, { status: 400 });
    console.error("결과 계산 실패:", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({ error: "계산 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  if (computed.kind === "candidates") return NextResponse.json({ error: "캐릭터 후보를 먼저 골라 주세요.", ...computed.payload }, { status: 409 });

  try {
    const id = await saveResult({
      userId,
      nickname: parsed.nickname,
      firstTime: body.firstTime === true,
      input: parsed.input,
      answers: parsed.answers,
      birth: computed.birth,
    });
    return NextResponse.json({ id, result: computed.result });
  } catch (e) {
    // 저장에 실패해도 결과는 보여 준다(저장은 편의 기능 — 안전과 무관). 화면에 '저장하지 못했어요'를 알린다.
    console.error(e instanceof Error ? e.message : "결과 저장 실패");
    return NextResponse.json({ id: null, saveError: true, result: computed.result });
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  try {
    return NextResponse.json({ results: await listResults(userId) });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "결과 목록 실패");
    return NextResponse.json({ error: "결과를 불러오지 못했어요." }, { status: 500 });
  }
}
