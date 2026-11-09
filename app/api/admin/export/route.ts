import { NextRequest, NextResponse } from "next/server";
import { buildExportCsv, isAdmin } from "@/lib/admin/data";
import { parseAdminDay } from "@/lib/admin/stats";

// 관리자 전용(owner 2026-11-09): 참가자 목록 엑셀(CSV, 한글 깨짐 방지 BOM). scope=day 그날 / upto 그날까지 전체.
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "관리자 계정으로 로그인해 주세요." }, { status: 403 });
  const day = parseAdminDay(req.nextUrl.searchParams.get("day"));
  const scope = req.nextUrl.searchParams.get("scope") === "upto" ? "upto" : "day";
  if (!day) return NextResponse.json({ error: "날짜 형식이 맞지 않아요." }, { status: 400 });
  try {
    const { csv } = await buildExportCsv(day, scope);
    const name = `astro_participants_${scope === "day" ? day : `upto_${day}`}.csv`;
    return new NextResponse(csv, {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" },
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "내보내기 실패");
    return NextResponse.json({ error: "엑셀 파일을 만들지 못했어요." }, { status: 500 });
  }
}
