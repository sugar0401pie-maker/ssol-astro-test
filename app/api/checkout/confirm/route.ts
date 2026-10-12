import { NextRequest, NextResponse, after } from "next/server";
import { resolveOwner } from "@/lib/results/owner";
import { cancelTossPayment, confirmTossPayment, getTossPayment } from "@/lib/billing/toss";
import { decideAfterConfirmFailure } from "@/lib/billing/confirmDecision";
import { runReportGeneration } from "@/lib/results/report";
import { getOrder, isResultPaid, markOrderPaid, markResultPaid, ownsOrder, settleOrder } from "@/lib/results/store";

const CONFIRM_RETRY_MESSAGE = "결제 확인이 늦어지고 있어요. 잠시 뒤 이 화면을 새로고침해 주세요. 계속되면 contact@ssolwellness.com으로 알려 주세요.";

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
    if (order.amount !== amount) return NextResponse.json({ error: "결제 금액이 일치하지 않아요." }, { status: 400 });

    let method: string | null = null;
    if (order.status === "pending") {
      // 같은 결과를 이미 결제했다면(다른 탭의 주문) 토스 승인을 하지 않는다 — 승인 전이면 카드에서 돈이 나가지 않는다.
      if (order.result_id && (await isResultPaid(order.result_id))) {
        await settleOrder(orderId, "canceled");
        return NextResponse.json({ error: "이미 결제한 결과예요. 결과 화면에서 바로 볼 수 있어요.", resultId: order.result_id }, { status: 409 });
      }
      const r = await confirmTossPayment({ paymentKey, orderId, amount });
      if (r.ok) method = r.method;
      else {
        // 승인 응답이 실패여도 토스에서는 이미 승인됐을 수 있다(응답 유실, 새로고침으로 두 번 승인 → '이미 처리됨').
        // 실제 상태를 물어 DONE이면 결제 완료, 확실히 승인 안 됐을 때만 취소, 모르면 그대로 두고 다시 시도하게 한다.
        const decision = decideAfterConfirmFailure(await getTossPayment(paymentKey), { orderId, amount });
        if (decision === "cancel") {
          await settleOrder(orderId, "canceled");
          return NextResponse.json({ error: r.error }, { status: 502 });
        }
        if (decision === "retry") return NextResponse.json({ error: CONFIRM_RETRY_MESSAGE }, { status: 503 });
        method = (await getTossPayment(paymentKey))?.method ?? null;
      }
    } else {
      // 'canceled' 주문: 예전에 오류로 잘못 취소됐을 수 있으니 토스에서 실제로 승인됐는지만 확인한다(다시 승인하지 않음).
      const lookup = await getTossPayment(paymentKey);
      if (decideAfterConfirmFailure(lookup, { orderId, amount }) !== "paid") return NextResponse.json({ error: "이미 처리된 주문이에요." }, { status: 409 });
      method = lookup?.method ?? null;
    }

    // 여기부터는 토스 승인이 확인됨. 저장이 실패하면 주문은 pending으로 남아, 새로고침 때 '이미 처리됨' → 상태 조회로 다시 이어진다.
    const saved = await markOrderPaid(orderId, { paymentKey, method });
    if (saved === "duplicate") {
      // 같은 결과에 이미 결제된 주문이 있다(두 탭에서 동시에 결제) — 이번 결제는 토스에서 취소한다.
      const refunded = await cancelTossPayment(paymentKey, "같은 결과에 대한 중복 결제");
      if (refunded) await settleOrder(orderId, "canceled");
      console.error(refunded ? "중복 결제 취소함" : "중복 결제 취소 실패(수동 확인 필요)");
      return NextResponse.json({ error: refunded ? "이미 결제한 결과라 이번 결제는 취소했어요." : CONFIRM_RETRY_MESSAGE, resultId: order.result_id }, { status: 409 });
    }
    if (order.result_id) {
      const resultId = order.result_id;
      await markResultPaid(resultId);
      after(() => runReportGeneration(resultId));
    }
    return NextResponse.json({ ok: true, resultId: order.result_id, guest: owner.kind === "guest" });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "결제 승인 처리 실패");
    return NextResponse.json({ error: "결제 확인 중 문제가 생겼어요. 고객센터로 문의해 주세요." }, { status: 500 });
  }
}
