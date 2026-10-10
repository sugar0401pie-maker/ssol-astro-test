import { resolveOwner } from "@/lib/results/owner";
import { NextRequest, NextResponse } from "next/server";
import { computeFree } from "@/lib/results/compute";
import { deleteResult, getPayState, getResult, isUuid, updateResultPick } from "@/lib/results/store";
import { chatSummaryFor } from "@/lib/results/chatSummary";
import { CHARACTER_GRID, type Competency } from "@/lib/astro/constants";

// 저장한 결과 다시 보기(저장된 입력으로 다시 계산 — 해석 DB가 고쳐지면 새 문장으로 보인다) / 지우기. 본인 것만.
export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/results/[id]">) {
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "결과를 찾을 수 없어요. 처음부터 다시 시도해 주세요." }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
  try {
    const row = await getResult(owner, id);
    if (!row) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
    const c = computeFree(row.birth_input, row.answers, row.nickname);
    if (c.kind !== "result") return NextResponse.json({ error: "결과를 다시 계산하지 못했어요." }, { status: 500 });
    return NextResponse.json({ id: row.id, createdAt: row.created_at, nickname: row.nickname, firstTime: row.first_time, paid: !!row.paid_at, guest: owner.kind === "guest", result: c.result });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "결과 조회 실패");
    return NextResponse.json({ error: "결과를 불러오지 못했어요." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/results/[id]">) {
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "결과를 찾을 수 없어요. 처음부터 다시 시도해 주세요." }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
  try {
    const ok = await deleteResult(owner, id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "결과 삭제 실패");
    return NextResponse.json({ error: "지우지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}

/**
 * 결과 2번 섹션 "요즘의 나와 더 가까운 건?"(A등급 역량 동점, 프로토타입 renderType): 고른 역량으로 다시 계산해 저장값을 고친다.
 * 1·2위 중 하나일 때만 반영된다(엔진 withCompetencyPick). 결제한 결과는 리포트가 이미 그 유형으로 만들어져 바꾸지 않는다.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/results/[id]">) {
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "결과를 찾을 수 없어요. 처음부터 다시 시도해 주세요." }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const pick = body?.competencyPick;
  if (typeof pick !== "string" || !Object.keys(CHARACTER_GRID).includes(pick)) return NextResponse.json({ error: "고른 유형을 다시 확인해 주세요." }, { status: 400 });
  try {
    const row = await getResult(owner, id);
    if (!row) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
    if (row.paid_at || (await getPayState(owner, id).catch(() => null))?.paid) return NextResponse.json({ error: "리포트가 이미 만들어진 결과는 유형을 바꿀 수 없어요." }, { status: 409 });
    const input = { ...row.birth_input, competencyPick: pick as Competency };
    const c = computeFree(input, row.answers, row.nickname);
    if (c.kind !== "result") return NextResponse.json({ error: "결과를 다시 계산하지 못했어요." }, { status: 500 });
    const ch = c.birth.resolved.character;
    await updateResultPick(owner, id, { input, character: ch.name, competency: ch.competency, style: ch.style, chatSummary: chatSummaryFor(c, row.answers) });
    return NextResponse.json({ result: c.result });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "유형 바꾸기 실패");
    return NextResponse.json({ error: "바꾸지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
