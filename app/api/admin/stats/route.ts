import { NextRequest, NextResponse } from "next/server";
import { isAdmin, loadAdminStats } from "@/lib/admin/data";
import { funnelRows, parseAdminDay } from "@/lib/admin/stats";

// 관리자 전용(owner 2026-11-09): 고른 날짜(한국) 기준 그날·누적 숫자와 앞 단계 대비 전환율.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "관리자 계정으로 로그인해 주세요." }, { status: 403 });
  const day = parseAdminDay(req.nextUrl.searchParams.get("day"));
  if (!day) return NextResponse.json({ error: "날짜 형식이 맞지 않아요." }, { status: 400 });
  try {
    const stats = await loadAdminStats(day);
    if (stats === "missing") return NextResponse.json({ error: "집계 함수가 아직 없어요. Supabase SQL Editor에서 20261109000000_astro_admin_stats.sql을 실행해 주세요." }, { status: 503 });
    return NextResponse.json({ day, rows: funnelRows(stats), stats });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "집계 실패");
    return NextResponse.json({ error: "숫자를 불러오지 못했어요." }, { status: 500 });
  }
}
