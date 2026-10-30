import { resolveOwner } from "@/lib/results/owner";
import { NextRequest, NextResponse, after } from "next/server";
import { runReportGeneration } from "@/lib/results/report";
import { getPayState, isUuid } from "@/lib/results/store";
import { grantIfComp } from "@/lib/results/comp";

// 유료 리포트 받기(결제한 본인만). 아직 없거나 실패했으면 만들기를 다시 시작하고 'generating'을 알려 준다
// — 화면은 몇 초마다 다시 물어본다. 결제 전이면 402(본문은 절대 보내지 않음).
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest, ctx: RouteContext<"/api/results/[id]/report">) {
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "결과를 찾을 수 없어요. 처음부터 다시 시도해 주세요." }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
  try {
    const s = await getPayState(owner, id);
    if (!s) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
    // 관리자 계정은 결제 없이(lib/billing/comp.ts) — 열람 가능으로 바꾸고 생성 시작, 화면은 다시 물어본다
    if (!s.paid) {
      if (await grantIfComp(owner, id)) return NextResponse.json({ status: "generating" });
      return NextResponse.json({ error: "결제 후 볼 수 있어요." }, { status: 402 });
    }
    if (s.reportStatus === "ready" && s.report) return NextResponse.json({ status: "ready", report: forBrowser(s.report) });
    // 없음·실패·오래 멈춘 생성 → 다시 시작(이미 진행 중이면 runReportGeneration이 알아서 건너뜀)
    // ?retry=1: 화면이 30초 동안 아무것도 받지 못했다(owner 2026-10-11 '30초 지나면 재시도') — 30초 넘게 멈춘 생성도 다시 시작.
    // 다 쓴 섹션이 하나라도 있으면 진행 중으로 보고 재시도하지 않는다(같은 리포트를 두 번 만들지 않게).
    const hasPartial = !!(s.report as { partial?: boolean } | null)?.partial;
    const retry = req.nextUrl.searchParams.get("retry") === "1" && !hasPartial;
    after(() => runReportGeneration(id, { retry }));
    // 쓰는 중이면 다 쓴 섹션까지(partial) 함께 보낸다 — 결제한 본인에게만
    const partial = s.reportStatus === "generating" && (s.report as { partial?: boolean } | null)?.partial ? s.report : undefined;
    return NextResponse.json({ status: "generating", ...(partial ? { report: forBrowser(partial) } : {}) });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "리포트 조회 실패");
    return NextResponse.json({ error: "리포트를 불러오지 못했어요." }, { status: 500 });
  }
}

/** 생성 기록(log: 프롬프트 판·토큰)은 운영용 — 화면에는 보내지 않는다 */
function forBrowser(report: unknown) {
  if (!report || typeof report !== "object") return report;
  const { log: _log, ...rest } = report as Record<string, unknown>;
  void _log;
  return rest;
}
