import { NextRequest, NextResponse, after } from "next/server";
import { resolveOwner } from "@/lib/results/owner";
import { cancelTossPayment, confirmTossPayment, getTossPayment } from "@/lib/billing/toss";
import { decideAfterConfirmFailure } from "@/lib/billing/confirmDecision";
import { usdToCents } from "@/lib/billing/pricingEn";
import { runReportGeneration } from "@/lib/results/report";
import { getAccountEmail, getResultCard, getOrder, isResultPaid, markOrderPaid, markResultPaid, ownsOrder, settleOrder } from "@/lib/results/store";
import { buildOrderEmailEn, isEmail } from "@/lib/billing/orderEmailEn";
import { SIGNS } from "@/lib/astro/constants";
import { SIGN_EN } from "@/lib/report/lang";
import { kakaoArtUrl, pickSignArt, signArtChoices } from "@/lib/share/signShare";
import { sendEmail } from "@/lib/email/resend";
import { sendXConversion } from "@/lib/x/sendConversion";
import { clientIp } from "@/lib/x/conversion";
import { X_EVENT_IDS } from "@/lib/x/events";
import { sanitizeTouch } from "@/lib/attribution/attribution";
import { allowedOn, CC_COOKIE, parseChoice } from "@/lib/i18n/cookieConsent";

// 영문판 결제 승인(2026-11-04). 한국어 confirm과 같은 순서(내 주문·처리 전·금액 일치 → 시크릿 키로 승인 → 승인됐을 때만 결제 완료)를
// 해외결제 키(TOSS_EN_SECRET_KEY)와 USD로 한다. 금액은 센트로 바꿔 비교한다(2.99 같은 소수 비교 오차 방지).
// 처음 결제 완료로 바뀔 때 한 번: 주문 확인 이메일(08 §4, 계정 이메일 또는 결제 화면에서 받은 주소) + X 서버 전환(광고 쿠키에
// 동의했고(swh_cc) Global Privacy Control(Sec-GPC)이 꺼진 경우만 — 영문 화면 쿠키 규칙과 같다).
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
    let tossEmail: string | null = null;
    if (order.status === "pending") {
      if (order.result_id && (await isResultPaid(order.result_id))) {
        await settleOrder(orderId, "canceled");
        return NextResponse.json({ error: "You’ve already unlocked this report.", resultId: order.result_id }, { status: 409 });
      }
      const r = await confirmTossPayment({ paymentKey, orderId, amount: tossAmount }, secret);
      if (r.ok) {
        method = r.method;
        tossEmail = r.customerEmail ?? null;
      }
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
    const paidAt = new Date();
    after(async () => {
      // 받는 사람: 주문에 남긴 주소 → 로그인 계정 이메일 → 토스 결제창에서 받은 이메일(owner: 이메일은 토스에서)
      const to = order.receipt_email ?? (order.user_id ? await getAccountEmail(order.user_id) : null) ?? (isEmail(tossEmail) ? tossEmail : null);
      if (!to) return console.warn("영문 주문 확인 이메일: 받을 주소 없음");
      // 카드 그림 = 그 결과의 태양 별자리 그림(리포트 완성 메일과 같은 jpg). 못 찾으면 그림 없이
      const card = order.result_id ? await getResultCard(order.result_id) : null;
      const signIndex = card ? SIGNS.indexOf(card.sunSign as (typeof SIGNS)[number]) : -1;
      const art = signIndex >= 0 ? (pickSignArt(signIndex) ?? signArtChoices(signIndex)[0]) : null;
      const mail = buildOrderEmailEn({
        orderId,
        paidAt,
        method,
        resultId: order.result_id,
        imageUrl: art ? kakaoArtUrl(art) : null,
        sunSign: card ? (SIGN_EN[card.sunSign] ?? null) : null,
        nickname: card?.nickname ?? null,
      });
      const r = await sendEmail({ to, ...mail, from: "SSOL Astro House <noreply@ssolwellnesshouse.com>" });
      if (!r.ok) console.error("영문 주문 확인 이메일 실패:", r.reason);
    });
    const adsOk = allowedOn("ads", "/en/checkout/success", parseChoice(req.cookies.get(CC_COOKIE)?.value), req.headers.get("sec-gpc") === "1");
    if (adsOk) {
      const twclid = sanitizeTouch({ first_seen_at: new Date().toISOString(), ...(order.attribution_last ?? {}) })?.twclid ?? null;
      const ip = clientIp(req.headers);
      const ua = req.headers.get("user-agent");
      after(async () => {
        await sendXConversion({ eventId: X_EVENT_IDS.purchase, conversionId: orderId, eventSourceUrl: "https://astro.ssolwellnesshouse.com/en/checkout/success", ids: { twclid, ipAddress: ip, userAgent: ua }, value: cents / 100, currency: "USD" });
      });
    }
    return NextResponse.json({ ok: true, resultId: order.result_id, guest: owner.kind === "guest" });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "영문 결제 승인 처리 실패");
    return NextResponse.json({ error: "Something went wrong while confirming your payment. Please email contact@ssolwellness.com." }, { status: 500 });
  }
}
