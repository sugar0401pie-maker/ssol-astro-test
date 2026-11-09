import { NextRequest, NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin/data";
import { parseDayParam } from "@/lib/report/fallback";
import { listFallbackReports, redoFallbackReport, type RedoResult } from "@/lib/results/report";

// 관리자 전용(owner 2026-11-08): AI 없이 나간 결제 리포트 목록 보기·다시 만들어 보내기.
// 관리자 = lib/billing/comp.ts 목록(+ Vercel ASTRO_COMP_EMAILS). 그 밖의 계정은 403.
export const runtime = "nodejs";
export const maxDuration = 300;


export async function GET(req: NextRequest) {
  const deny = await adminGuard(req);
  if (deny) return deny;
  const day = parseDayParam(req.nextUrl.searchParams.get("day"));
  if (day === null) return NextResponse.json({ error: "날짜 형식이 맞지 않아요." }, { status: 400 });
  try {
    return NextResponse.json({ items: await listFallbackReports(day) });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "목록 실패");
    return NextResponse.json({ error: "목록을 불러오지 못했어요." }, { status: 500 });
  }
}

/** 한 번에 최대 3건(리포트 한 건에 AI 20~60초). AI가 아직 안 되면 바로 멈춘다 — 기존 리포트는 그대로. */
export async function POST(req: NextRequest) {
  const deny = await adminGuard(req);
  if (deny) return deny;
  const day = parseDayParam(req.nextUrl.searchParams.get("day"));
  if (day === null) return NextResponse.json({ error: "날짜 형식이 맞지 않아요." }, { status: 400 });
  try {
    const items = (await listFallbackReports(day)).slice(0, 3);
    const done: Array<{ id: string; result: RedoResult }> = [];
    for (const it of items) {
      const result = await redoFallbackReport(it.id);
      done.push({ id: it.id, result });
      if (result === "ai_still_failing") break;
    }
    return NextResponse.json({ done });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "다시 만들기 실패");
    return NextResponse.json({ error: "다시 만들지 못했어요." }, { status: 500 });
  }
}
