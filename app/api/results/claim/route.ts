import { NextRequest, NextResponse, after } from "next/server";
import { emailReportIfReady } from "@/lib/results/report";
import { guestHashFrom } from "@/lib/results/owner";
import { claimGuestResults } from "@/lib/results/store";
import { claimGuestConsents } from "@/lib/results/consentLog";
import { getUserIdFromAuthHeader } from "@/lib/supabase/auth";

// 가입·로그인 직후: 이 브라우저의 비회원 결과·주문을 계정으로 옮긴다(로그인 토큰 + 비회원 열쇠 둘 다 필요).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const hash = guestHashFrom(req.headers);
  if (!hash) return NextResponse.json({ claimed: 0 });
  try {
    const ids = await claimGuestResults(userId, hash);
    await claimGuestConsents(userId, hash);
    // 비회원 때 결제한 리포트는 보낼 주소가 없었다 — 계정으로 옮긴 지금 메일로 보낸다(이미 보냈으면 건너뜀)
    if (ids.length) after(() => Promise.all(ids.map(emailReportIfReady)).then(() => {}));
    return NextResponse.json({ claimed: ids.length });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "결과 옮기기 실패");
    return NextResponse.json({ error: "결과를 계정으로 옮기지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
