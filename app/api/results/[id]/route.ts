import { resolveOwner } from "@/lib/results/owner";
import { NextRequest, NextResponse } from "next/server";
import { computeFree } from "@/lib/results/compute";
import { deleteResult, getResult, isUuid } from "@/lib/results/store";

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
