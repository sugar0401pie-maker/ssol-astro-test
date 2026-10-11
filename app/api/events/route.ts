import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserIdFromAuthHeader } from "@/lib/supabase/auth";
import { isAnonId, isFunnelEvent, sanitizeProps } from "@/lib/analytics/events";

// 이용 흐름 기록(owner 결정 2026-10-11). 정해 둔 이벤트 이름과 짧은 값만 받는다 — 그 밖의 칸은 버린다.
// 기록이 실패해도 화면에는 아무 영향이 없게 늘 204를 돌려준다(분석용이라 서비스 동작과 무관).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (text.length > 2000) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(text) as { event?: unknown; props?: unknown; anonId?: unknown };
    if (!isFunnelEvent(body.event)) return new NextResponse(null, { status: 204 });
    const userId = await getUserIdFromAuthHeader(req.headers.get("authorization"));
    const { error } = await createAdminClient()
      .from("astro_funnel_events")
      .insert({ user_id: userId, anon_id: isAnonId(body.anonId) ? body.anonId : null, event: body.event, props: sanitizeProps(body.props) });
    if (error) console.warn("이용 흐름 기록 실패:", error.code);
  } catch {
    /* 형식이 틀린 요청은 무시 */
  }
  return new NextResponse(null, { status: 204 });
}
