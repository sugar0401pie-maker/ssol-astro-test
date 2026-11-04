"use client";

// 영문판: 결제 버튼을 누르면 곧바로 토스 결제창을 연다(owner 2026-11-04 '바로 결제창 띄워라').
// 주문(금액은 서버가 정함) → 토스 결제창 v2. 이메일은 받지 않는다(owner: 이메일은 토스 결제창 쪽에서).
// 실패하면 토스가 준 code·message를 그대로 돌려준다 — 무엇이 막혔는지 바로 알 수 있게.
import { apiHeaders } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";
import { getAttribution } from "@/lib/attribution/client";
import { track } from "@/lib/analytics/track";
import type { EnPayMethod } from "./pricingEn";

type Order = { orderId: string; orderName: string; amount: { currency: string; value: number }; customerKey: string; country: string };

/** 결제창이 열리면(페이지가 토스로 넘어가면) 돌아오지 않는다. 문제가 있으면 안내 문구, 사용자가 닫으면 null */
export async function startEnPayment(resultId: string, page: number, method: EnPayMethod): Promise<string | null> {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_EN_CLIENT_KEY;
  if (!clientKey) return "Payments for the English site are opening soon. You won’t be charged.";
  try {
    const session = await getRealSession();
    const res = await fetch("/api/en/checkout", {
      method: "POST",
      headers: apiHeaders(session, { "content-type": "application/json" }),
      body: JSON.stringify({ resultId, attributionLast: getAttribution()?.last ?? null }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.status === 409 && d.paid) {
      window.location.replace(`/en/results/${resultId}/${page}`);
      return null;
    }
    if (!res.ok || !d.orderId) return d.error ?? "We couldn’t start the payment. Please try again.";
    const o = d as Order;
    track("pay_start", { page, from: method === "paypal" ? "en_paypal" : "en_card" });
    const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
    const toss = await loadTossPayments(clientKey);
    const payment = toss.payment({ customerKey: o.customerKey });
    const origin = window.location.origin;
    const common = {
      amount: o.amount,
      orderId: o.orderId,
      orderName: o.orderName,
      successUrl: `${origin}/en/checkout/success?page=${page}`,
      failUrl: `${origin}/en/checkout/fail?resultId=${resultId}&page=${page}`,
    };
    // SDK 타입은 일반 결제를 원화로 적어 두었지만 해외카드·PayPal은 USD 계약(owner) — 요청 모양은 SDK PaymentRequest.d.ts대로
    const request =
      method === "card"
        ? { ...common, method: "CARD", card: { useInternationalCardOnly: true, language: "EN" } }
        : { ...common, method: "FOREIGN_EASY_PAY", foreignEasyPay: { provider: "PAYPAL", country: o.country } };
    await payment.requestPayment(request as never);
    return null;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err?.code === "USER_CANCEL" || err?.code === "PAY_PROCESS_CANCELED") return null;
    // 토스가 준 이유를 그대로 보여 준다(설정 문제를 바로 찾으려고)
    return `We couldn’t open the payment window.${err?.code ? ` (${err.code}${err.message ? `: ${err.message}` : ""})` : ""}`;
  }
}
