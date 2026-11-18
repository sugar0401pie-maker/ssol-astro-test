import { NextRequest, NextResponse, after } from "next/server";
import { resolveOwner } from "@/lib/results/owner";
import { getOrder, getOrderPaymentKey, isResultPaid, markOrderPaid, markResultPaid, ownsOrder, settleOrder } from "@/lib/results/store";
import { KAKAOPAY_METHOD, decideAfterKakaoApproveFailure } from "@/lib/billing/kakaopay";
import { kakaoApprove, kakaoCancel, kakaoOrder, kakaoUserRef } from "@/lib/billing/kakaopayApi";
import { runReportGeneration } from "@/lib/results/report";
import { sendXConversion } from "@/lib/x/sendConversion";
import { clientIp } from "@/lib/x/conversion";
import { X_EVENT_IDS } from "@/lib/x/events";
import { sanitizeTouch } from "@/lib/attribution/attribution";

const RETRY = "결제 확인이 늦어지고 있어요. 잠시 뒤 이 화면을 새로고침해 주세요. 계속되면 contact@ssolwellness.com으로 알려 주세요.";

// 카카오페이 결제 승인(owner 2026-11-18): 카카오페이가 돌려준 pg_token으로 서버가 승인 → 주문 번호·금액 확인 → 결제 완료.
// 토스 확인(/api/checkout/confirm)과 같은 원칙 — 돈이 나갔을 수 있으면 취소로 바꾸지 않고, 같은 결과 중복 결제는 카카오페이에서 취소.
export const runtime = "nodejs";
export const maxDuration = 300;
const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function POST(req: NextRequest) {
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "결과를 찾을 수 없어요. 결제한 기기·브라우저에서 다시 열어 주세요." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { orderId?: unknown; pgToken?: unknown };
  const orderId = typeof body.orderId === "string" && UUID_RE.test(body.orderId) ? body.orderId : "";
  const pgToken = typeof body.pgToken === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(body.pgToken) ? body.pgToken : "";
  if (!orderId || !pgToken) return NextResponse.json({ error: "결제 정보가 올바르지 않아요." }, { status: 400 });
  try {
    const order = await getOrder(orderId);
    if (!order || !ownsOrder(owner, order)) return NextResponse.json({ error: "주문 정보를 찾을 수 없어요." }, { status: 404 });
    if (order.status === "paid") return NextResponse.json({ ok: true, resultId: order.result_id, guest: owner.kind === "guest" }); // 새로고침
    const tid = (await getOrderPaymentKey(orderId)) ?? "";
    if (!tid) return NextResponse.json({ error: "결제 정보가 올바르지 않아요." }, { status: 400 });
    const expect = { orderId, amount: order.amount };

    if (order.status === "pending") {
      if (order.result_id && (await isResultPaid(order.result_id))) {
        await settleOrder(orderId, "canceled"); // 승인 전이라 돈이 나가지 않는다
        return NextResponse.json({ error: "이미 결제한 결과예요. 결과 화면에서 바로 볼 수 있어요.", resultId: order.result_id }, { status: 409 });
      }
      const r = await kakaoApprove({ tid, orderId, userRef: kakaoUserRef(order), pgToken });
      if (r.ok) {
        const total = r.body.amount?.total;
        if (r.body.partner_order_id !== orderId || total !== order.amount) {
          const refunded = await kakaoCancel(tid, typeof total === "number" ? total : order.amount);
          if (refunded) await settleOrder(orderId, "canceled");
          console.error(refunded ? "카카오페이 금액 불일치 — 취소함" : "카카오페이 금액 불일치 — 취소 실패(수동 확인 필요)");
          return NextResponse.json({ error: "결제 금액이 일치하지 않아 결제를 취소했어요." }, { status: 400 });
        }
      } else {
        console.warn("카카오페이 승인 실패:", { code: r.code, network: r.network });
        const d = decideAfterKakaoApproveFailure(await kakaoOrder(tid), expect);
        if (d === "cancel") {
          await settleOrder(orderId, "canceled");
          return NextResponse.json({ error: `카카오페이 결제가 완료되지 않았어요. ${r.message}${r.code ? ` (오류 코드 ${r.code})` : ""}` }, { status: 502 });
        }
        if (d === "retry") return NextResponse.json({ error: RETRY }, { status: 503 });
      }
    } else if (decideAfterKakaoApproveFailure(await kakaoOrder(tid), expect) !== "paid") {
      // 'canceled' 주문: 잘못 취소됐을 수 있으니 실제로 결제됐는지만 확인(다시 승인하지 않음)
      return NextResponse.json({ error: "이미 처리된 주문이에요." }, { status: 409 });
    }

    // 여기부터는 카카오페이 결제가 확인됨
    const saved = await markOrderPaid(orderId, { paymentKey: tid, method: KAKAOPAY_METHOD });
    if (saved === "duplicate") {
      const refunded = await kakaoCancel(tid, order.amount);
      if (refunded) await settleOrder(orderId, "canceled");
      console.error(refunded ? "중복 결제(카카오페이) 취소함" : "중복 결제(카카오페이) 취소 실패(수동 확인 필요)");
      return NextResponse.json({ error: refunded ? "이미 결제한 결과라 이번 결제는 취소했어요." : RETRY, resultId: order.result_id }, { status: 409 });
    }
    if (order.result_id) {
      const resultId = order.result_id;
      await markResultPaid(resultId);
      after(() => runReportGeneration(resultId));
    }
    // X 광고 전환(결제 완료) — 토스 결제와 같은 방식
    const twclid = sanitizeTouch({ first_seen_at: new Date().toISOString(), ...(order.attribution_last ?? {}) })?.twclid ?? null;
    const ip = clientIp(req.headers);
    const ua = req.headers.get("user-agent");
    after(async () => {
      await sendXConversion({
        eventId: X_EVENT_IDS.purchase,
        conversionId: orderId,
        eventSourceUrl: "https://astro.ssolwellnesshouse.com/checkout/kakaopay",
        ids: { twclid, ipAddress: ip, userAgent: ua },
        value: order.amount,
        currency: "KRW",
      });
    });
    return NextResponse.json({ ok: true, resultId: order.result_id, guest: owner.kind === "guest", amount: order.amount });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "카카오페이 승인 처리 실패");
    return NextResponse.json({ error: "결제 확인 중 문제가 생겼어요. 고객센터로 문의해 주세요." }, { status: 500 });
  }
}
