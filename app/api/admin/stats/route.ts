import { NextRequest, NextResponse } from "next/server";
import { adminGuard, loadAdminStats } from "@/lib/admin/data";
import { funnelRows, parseAdminDay, previousDay } from "@/lib/admin/stats";

// 관리자 전용(owner 2026-11-09): 고른 날짜(한국) 기준 그날·누적 숫자와 앞 단계 대비 전환율, 전날 대비 증감.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const deny = await adminGuard(req);
  if (deny) return deny;
  const day = parseAdminDay(req.nextUrl.searchParams.get("day"));
  if (!day) return NextResponse.json({ error: "날짜 형식이 맞지 않아요." }, { status: 400 });
  try {
    const [stats, yesterday] = await Promise.all([loadAdminStats(day), loadAdminStats(previousDay(day))]);
    if (stats === "missing") return NextResponse.json({ error: "집계 함수가 아직 없어요. Supabase SQL Editor에서 20261109000000_astro_admin_stats.sql을 실행해 주세요." }, { status: 503 });
    return NextResponse.json({ day, rows: funnelRows(stats, yesterday === "missing" ? null : yesterday), stats });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "집계 실패");
    return NextResponse.json({ error: "숫자를 불러오지 못했어요." }, { status: 500 });
  }
}
