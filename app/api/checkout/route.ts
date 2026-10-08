import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromAuthHeader } from "@/lib/supabase/auth";
import { REPORT_ORDER_NAME, REPORT_PRICE } from "@/lib/billing/pricing";
import { createOrder, getPayState, isUuid } from "@/lib/results/store";

// 결제 주문 만들기: 내 결과인지·아직 결제 전인지 확인하고, 금액은 서버가 정한다. 돌려준 orderId로 토스 결제창을 연다.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  let body: { resultId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const resultId = typeof body.resultId === "string" ? body.resultId : "";
  if (!isUuid(resultId)) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
  try {
    const state = await getPayState(userId, resultId);
    if (!state) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
    if (state.paid) return NextResponse.json({ error: "이미 결제한 리포트예요.", paid: true }, { status: 409 });
    const orderId = await createOrder(userId, resultId, REPORT_PRICE);
    return NextResponse.json({ orderId, orderName: REPORT_ORDER_NAME, amount: REPORT_PRICE, customerKey: userId });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "주문 생성 실패");
    return NextResponse.json({ error: "주문을 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
