import { NextRequest, NextResponse, after } from "next/server";
import { resolveOwner } from "@/lib/results/owner";
import { confirmTossPayment } from "@/lib/billing/toss";
import { runReportGeneration } from "@/lib/results/report";
import { getOrder, markResultPaid, ownsOrder, settleOrder } from "@/lib/results/store";

// 토스 결제창에서 돌아온 값(paymentKey·orderId·amount)을 그대로 믿지 않는다:
// ① 내 주문·처리 전·금액 일치 확인 → ② 시크릿 키로 토스에 승인 요청 → ③ 승인됐을 때만 결제 완료 처리.
// 승인 뒤 리포트 생성(20~60초)은 응답을 먼저 보낸 다음 after()로 이어서 한다 — 화면은 결과 페이지에서 기다린다.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "결과를 찾을 수 없어요. 처음부터 다시 시도해 주세요." }, { status: 401 });
  let body: { paymentKey?: unknown; orderId?: unknown; amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const paymentKey = typeof body.paymentKey === "string" ? body.paymentKey : "";
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const amount = Number(body.amount);
  if (!paymentKey || !orderId || !Number.isFinite(amount)) return NextResponse.json({ error: "결제 정보가 올바르지 않아요." }, { status: 400 });

  try {
    const order = await getOrder(orderId);
    if (!order || !ownsOrder(owner, order)) return NextResponse.json({ error: "주문 정보를 찾을 수 없어요." }, { status: 404 });
    if (order.status === "paid") return NextResponse.json({ ok: true, resultId: order.result_id, guest: owner.kind === "guest" }); // 새로고침 등으로 다시 온 경우
    if (order.status !== "pending") return NextResponse.json({ error: "이미 처리된 주문이에요." }, { status: 409 });
    if (order.amount !== amount) return NextResponse.json({ error: "결제 금액이 일치하지 않아요." }, { status: 400 });

    const r = await confirmTossPayment({ paymentKey, orderId, amount });
    if (!r.ok) {
      await settleOrder(orderId, "canceled");
      return NextResponse.json({ error: r.error }, { status: 502 });
    }
    await settleOrder(orderId, "paid", { paymentKey, method: r.method });
    if (order.result_id) {
      const resultId = order.result_id;
      await markResultPaid(resultId);
      after(() => runReportGeneration(resultId));
    }
    // guest: 결제 후 가입을 권한다(가입하면 이 결과·주문이 계정으로 옮겨진다).
    return NextResponse.json({ ok: true, resultId: order.result_id, guest: owner.kind === "guest" });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "결제 승인 처리 실패");
    return NextResponse.json({ error: "결제 확인 중 문제가 생겼어요. 고객센터로 문의해 주세요." }, { status: 500 });
  }
}
