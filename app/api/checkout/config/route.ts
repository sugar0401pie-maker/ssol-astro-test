import { NextResponse } from "next/server";
import { kakaopayEnabled } from "@/lib/billing/kakaopay";

// 결제 수단 설정(화면이 결제 버튼 모양을 고를 때) — 카카오페이 키가 있는지만(키 값은 보내지 않음).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ kakaopay: kakaopayEnabled() }, { headers: { "cache-control": "no-store" } });
}
