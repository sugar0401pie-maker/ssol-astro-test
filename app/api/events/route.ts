import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserIdFromAuthHeader } from "@/lib/supabase/auth";
import { isAnonId, isFunnelEvent, sanitizeProps } from "@/lib/analytics/events";
import { ANON_LIMIT, IP_LIMIT, windowLimiter } from "@/lib/analytics/rateLimit";
import { clientIp } from "@/lib/x/conversion";

// 이용 흐름 기록(owner 결정 2026-10-11). 정해 둔 이벤트 이름과 짧은 값만 받는다 — 그 밖의 칸은 버린다.
// 기록이 실패해도 화면에는 아무 영향이 없게 늘 204를 돌려준다(분석용이라 서비스 동작과 무관).
export const runtime = "nodejs";

// 요청 횟수 제한(같은 브라우저·같은 IP) — 넘으면 기록하지 않고 똑같이 204
const byAnon = windowLimiter(ANON_LIMIT.max, ANON_LIMIT.windowMs);
const byIp = windowLimiter(IP_LIMIT.max, IP_LIMIT.windowMs);

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (text.length > 2000) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(text) as { event?: unknown; props?: unknown; anonId?: unknown };
    if (!isFunnelEvent(body.event)) return new NextResponse(null, { status: 204 });
    const anonId = isAnonId(body.anonId) ? body.anonId : null;
    // IP는 세는 데만 쓰고 저장하지 않는다
    const ip = clientIp(req.headers);
    if (ip && !byIp.take(ip)) return new NextResponse(null, { status: 204 });
    if (anonId && !byAnon.take(anonId)) return new NextResponse(null, { status: 204 });
    const userId = await getUserIdFromAuthHeader(req.headers.get("authorization"));
    const { error } = await createAdminClient()
      .from("astro_funnel_events")
      .insert({ user_id: userId, anon_id: anonId, event: body.event, props: sanitizeProps(body.props) });
    if (error) console.warn("이용 흐름 기록 실패:", error.code);
  } catch {
    /* 형식이 틀린 요청은 무시 */
  }
  return new NextResponse(null, { status: 204 });
}
