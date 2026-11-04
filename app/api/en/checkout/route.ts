import { NextRequest, NextResponse } from "next/server";
import { resolveOwner } from "@/lib/results/owner";
import { EN_CURRENCY, EN_ORDER_NAME, EN_REPORT_PRICE_CENTS, centsToUsd, enPaymentsConfigured } from "@/lib/billing/pricingEn";
import { createOrder, getPayState, getResult, isUuid } from "@/lib/results/store";
import { recordConsents } from "@/lib/results/consentLog";
import { sanitizeTouch } from "@/lib/attribution/attribution";
import { isEmail } from "@/lib/billing/orderEmailEn";

// 영문판 결제 주문(2026-11-04, owner: 토스 API 개별 연동 키 live_ck_ · 결제창 · USD). 한국어 /api/checkout과 따로 둔다 —
// 금액·통화·키가 다르고, 한국어 결제 경로를 건드리지 않으려고. 금액(US$2.99)은 서버가 정하고 주문에는 센트(299)로 저장한다.
export const runtime = "nodejs";

const TOSS_ANONYMOUS = "@@ANONYMOUS";
/** 영문판 청약철회 안내(08 §4, 버튼 위 안내 + 약관·환불 정책) 판 — 문구를 바꾸면 이 값도 바꾼다 */
export const EN_WITHDRAWAL_NOTICE_VERSION = "en-withdrawal-2026-11-06-draft";

export async function POST(req: NextRequest) {
  if (!enPaymentsConfigured())
    return NextResponse.json({ error: "Payments aren’t available right now. You haven’t been charged." }, { status: 503 });
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "We couldn’t find this result. Please start again." }, { status: 401 });
  let body: { resultId?: unknown; attributionLast?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const resultId = typeof body.resultId === "string" ? body.resultId : "";
  if (!isUuid(resultId)) return NextResponse.json({ error: "We couldn’t find this result." }, { status: 404 });
  // 주문 확인 이메일(08 §4): 로그인한 사람은 계정 이메일. 로그인 없이 결제한 사람은 토스 결제창에서 받은 이메일(승인 응답) — owner 2026-11-04
  const receiptEmail = isEmail(body.email) ? body.email.trim() : null;
  try {
    const result = await getResult(owner, resultId);
    if (!result) return NextResponse.json({ error: "We couldn’t find this result." }, { status: 404 });
    // 영문 결과만 달러로 판다(한국어 결과는 원화 결제 화면에서) — 영문 리포트가 만들어지는 결과여야 산 것을 줄 수 있다
    if ((result.birth_input as { lang?: string }).lang !== "en") return NextResponse.json({ error: "This result uses the Korean checkout." }, { status: 409 });
    const state = await getPayState(owner, resultId);
    if (!state) return NextResponse.json({ error: "We couldn’t find this result." }, { status: 404 });
    if (state.paid) return NextResponse.json({ error: "You’ve already unlocked this report.", paid: true }, { status: 409 });
    const orderId = await createOrder(owner, resultId, EN_REPORT_PRICE_CENTS, EN_WITHDRAWAL_NOTICE_VERSION, sanitizeTouch(body.attributionLast), EN_CURRENCY, receiptEmail);
    await recordConsents(owner, ["withdrawal_limit"], EN_WITHDRAWAL_NOTICE_VERSION, { resultId, orderId });
    const country = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
    return NextResponse.json({
      orderId,
      orderName: EN_ORDER_NAME,
      amount: { currency: EN_CURRENCY, value: centsToUsd(EN_REPORT_PRICE_CENTS) },
      customerKey: owner.kind === "user" ? owner.userId : TOSS_ANONYMOUS,
      // PayPal(토스 해외간편결제)은 구매자 국가 코드가 필요하다 — 모르거나 한국이면 US
      country: /^[A-Z]{2}$/.test(country) && country !== "KR" ? country : "US",
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "영문 주문 생성 실패");
    return NextResponse.json({ error: "We couldn’t create your order. Please try again in a moment." }, { status: 500 });
  }
}
