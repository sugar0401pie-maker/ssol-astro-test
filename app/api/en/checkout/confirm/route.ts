import { NextRequest, NextResponse, after } from "next/server";
import { resolveOwner } from "@/lib/results/owner";
import { cancelTossPayment, confirmTossPayment, getTossPayment } from "@/lib/billing/toss";
import { decideAfterConfirmFailure } from "@/lib/billing/confirmDecision";
import { usdToCents } from "@/lib/billing/pricingEn";
import { runReportGeneration } from "@/lib/results/report";
import { getOrder, isResultPaid, markOrderPaid, markResultPaid, ownsOrder, settleOrder } from "@/lib/results/store";

// 영문판 결제 승인(2026-11-04). 한국어 confirm과 같은 순서(내 주문·처리 전·금액 일치 → 시크릿 키로 승인 → 승인됐을 때만 결제 완료)를
// 해외결제 키(TOSS_EN_SECRET_KEY)와 USD로 한다. 금액은 센트로 바꿔 비교한다(2.99 같은 소수 비교 오차 방지).
// X 광고 전환은 보내지 않는다 — 영문 화면은 광고 쿠키 동의(swh_cc)를 따라야 하는데 서버 전환은 아직 그 확인이 없어서.
export const runtime = "nodejs";
export const maxDuration = 300;

const RETRY = "Confirming your payment is taking longer than usual. Please refresh this page in a moment. If it keeps happening, email contact@ssolwellness.com.";

export async function POST(req: NextRequest) {
  const secret = process.env.TOSS_EN_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Payments aren’t available right now." }, { status: 503 });
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "We couldn’t find this result. Please start again." }, { status: 401 });
  let body: { paymentKey?: unknown; orderId?: unknown; amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const paymentKey = typeof body.paymentKey === "string" ? body.paymentKey : "";
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const usd = Number(body.amount);
  if (!paymentKey || !orderId || !Number.isFinite(usd)) return NextResponse.json({ error: "The payment details look incorrect." }, { status: 400 });
  const cents = usdToCents(usd);

  try {
    const order = await getOrder(orderId);
    if (!order || !ownsOrder(owner, order) || order.currency !== "USD") return NextResponse.json({ error: "We couldn’t find this order." }, { status: 404 });
    if (order.status === "paid") return NextResponse.json({ ok: true, resultId: order.result_id, guest: owner.kind === "guest" });
    if (order.amount !== cents) return NextResponse.json({ error: "The payment amount doesn’t match." }, { status: 400 });
    // 토스에는 달러 금액(2.99)으로 승인 요청·비교한다
    const tossAmount = cents / 100;

    let method: string | null = null;
    if (order.status === "pending") {
      if (order.result_id && (await isResultPaid(order.result_id))) {
        await settleOrder(orderId, "canceled");
        return NextResponse.json({ error: "You’ve already unlocked this report.", resultId: order.result_id }, { status: 409 });
      }
      const r = await confirmTossPayment({ paymentKey, orderId, amount: tossAmount }, secret);
      if (r.ok) method = r.method;
      else {
        const lookup = await getTossPayment(paymentKey, secret);
        const decision = decideAfterConfirmFailure(lookup, { orderId, amount: tossAmount });
        if (decision === "cancel") {
          await settleOrder(orderId, "canceled");
          return NextResponse.json({ error: "Your payment didn’t go through. You haven’t been charged." }, { status: 502 });
        }
        if (decision === "retry") return NextResponse.json({ error: RETRY }, { status: 503 });
        method = lookup?.method ?? null;
      }
    } else {
      const lookup = await getTossPayment(paymentKey, secret);
      if (decideAfterConfirmFailure(lookup, { orderId, amount: tossAmount }) !== "paid") return NextResponse.json({ error: "This order has already been handled." }, { status: 409 });
      method = lookup?.method ?? null;
    }

    const saved = await markOrderPaid(orderId, { paymentKey, method });
    if (saved === "duplicate") {
      const refunded = await cancelTossPayment(paymentKey, "Duplicate payment for the same result", secret);
      if (refunded) await settleOrder(orderId, "canceled");
      console.error(refunded ? "영문 중복 결제 취소함" : "영문 중복 결제 취소 실패(수동 확인 필요)");
      return NextResponse.json({ error: refunded ? "You’d already unlocked this report, so we canceled this payment." : RETRY, resultId: order.result_id }, { status: 409 });
    }
    if (order.result_id) {
      const resultId = order.result_id;
      await markResultPaid(resultId);
      after(() => runReportGeneration(resultId));
    }
    return NextResponse.json({ ok: true, resultId: order.result_id, guest: owner.kind === "guest" });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "영문 결제 승인 처리 실패");
    return NextResponse.json({ error: "Something went wrong while confirming your payment. Please email contact@ssolwellness.com." }, { status: 500 });
  }
}
