import { NextRequest, NextResponse } from "next/server";
import { computeFree, parseResultRequest } from "@/lib/results/compute";
import { listResults, saveResult } from "@/lib/results/store";
import { resolveOwner } from "@/lib/results/owner";
import { characterLabel } from "@/lib/report/characterDisplay";
import { ASTRO_DB } from "@/lib/report/dbData";

// POST: 저장 동의 → 서버가 다시 계산해 저장하고 무료 결과를 돌려준다(브라우저가 보낸 계산값은 쓰지 않음).
// 로그인했으면 계정에, 아니면 이 브라우저의 비회원 열쇠로 익명 저장(owner 결정 2026-10-08: 먼저 보고 저장 권유).
// GET: 내 결과 목록(계정 또는 이 브라우저의 비회원 결과). 출생 정보·답은 로그에 남기지 않는다.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "결과를 찾을 수 없어요. 처음부터 다시 시도해 주세요." }, { status: 401 });
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
    computed = computeFree(parsed.input, parsed.answers, parsed.nickname, { askTie: true });
  } catch (e) {
    if (e instanceof RangeError) return NextResponse.json({ error: "고른 시간을 다시 확인해 주세요." }, { status: 400 });
    console.error("결과 계산 실패:", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({ error: "계산 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  if (computed.kind !== "result") return NextResponse.json({ error: "요즘의 나와 더 가까운 쪽을 먼저 골라 주세요.", ...computed.payload }, { status: 409 });

  try {
    const id = await saveResult({
      owner,
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
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "결과를 찾을 수 없어요. 처음부터 다시 시도해 주세요." }, { status: 401 });
  try {
    // 저장값의 character는 내부 판정 이름 — 화면에는 표시 이름(SHOW_CHARACTER=false면 유형 한 줄)으로 바꿔 보낸다.
    const results = (await listResults(owner)).map((r) => ({ ...r, character: characterLabel(ASTRO_DB, r.character) }));
    return NextResponse.json({ results });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "결과 목록 실패");
    return NextResponse.json({ error: "결과를 불러오지 못했어요." }, { status: 500 });
  }
}
