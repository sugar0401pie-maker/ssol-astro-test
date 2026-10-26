import { NextRequest, NextResponse } from "next/server";
import { deleteExpiredGuestResults } from "@/lib/results/store";
import { deleteOldIpSaves } from "@/lib/results/ipLog";

// 하루 한 번(Vercel Cron, vercel.json): 보관 기한이 지난 비회원 결과와 7일 지난 저장 IP 기록(해시)을 지운다(마스터스펙 8-1 '비회원 결과는 일정 기간 후 삭제').
// Vercel이 보내는 "Authorization: Bearer <CRON_SECRET>"이 맞을 때만 — 비밀값이 설정되지 않았으면 아무것도 하지 않는다(fail closed).
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET이 설정되지 않았어요." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "권한이 없어요." }, { status: 401 });
  try {
    const deleted = await deleteExpiredGuestResults();
    const ipLogDeleted = await deleteOldIpSaves().catch((e) => {
      console.error(e instanceof Error ? e.message : "IP 기록 정리 실패");
      return 0;
    });
    return NextResponse.json({ deleted, ipLogDeleted });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "정리 실패");
    return NextResponse.json({ error: "정리하지 못했어요." }, { status: 500 });
  }
}
