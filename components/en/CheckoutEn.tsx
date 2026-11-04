"use client";

// 영문 결제 화면 /en/checkout/{resultId}((나) 영문 전용, owner 2026-11-04). 문구는 영문 정책 08_on-screen-texts §4 그대로
// (청약철회 포기는 약관에 두고 버튼 바로 위에 안내만 — 체크박스 아님).
// 결제는 한국어판(토스 결제위젯, 원화)과 다른 별도 연동(owner 2026-11-04): 토스 API 개별 연동 키(NEXT_PUBLIC_TOSS_EN_CLIENT_KEY)로
// 결제창 v2를 열고, 해외카드(VISA·MASTER·JCB, 영어 결제창, useInternationalCardOnly) 또는 PayPal(토스 해외간편결제) — 둘 다 USD 2.99.
// 금액·주문은 서버(/api/en/checkout)가 정하고, 승인은 /en/checkout/success → /api/en/checkout/confirm에서 서버가 확인한다.
import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/track";
import { enLegalUrl } from "@/lib/legal/en/blocks";
import { apiHeaders } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";
import { getAttribution } from "@/lib/attribution/client";
import type { EnPayMethod } from "@/lib/billing/pricingEn";
import { isEmail } from "@/lib/billing/orderEmailEn";

export const EN_PAY_COPY = {
  product: "Star report — US$2.99, one-time payment. No subscription, no automatic renewal.",
  notice:
    "Your report unlocks right after payment. By paying, you ask us to deliver it now and agree that you can't cancel once it is shown, as set out in the [Terms of Use] and [Refund Policy].",
  button: "Pay US$2.99 and get my report now",
  methods: "Visa · Mastercard · JCB · PayPal. Your bank may add a foreign-transaction fee.",
} as const;

type Order = { orderId: string; orderName: string; amount: { currency: string; value: number }; customerKey: string; country: string };

export default function CheckoutEn({ resultId, page }: { resultId: string; page: number }) {
  const [method, setMethod] = useState<EnPayMethod>("card");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // 로그인 없이 결제하면 주문 확인 이메일 받을 주소를 받는다(08 §4 — 로그인한 사람은 계정 이메일로)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  useEffect(() => {
    void getRealSession().then((s) => setLoggedIn(!!s));
  }, []);
  const clientKey = process.env.NEXT_PUBLIC_TOSS_EN_CLIENT_KEY;
  useEffect(() => {
    track("pay_click", { page, from: "en" }, `pay_click:${resultId}`);
  }, [resultId, page]);
  const [before, rest] = EN_PAY_COPY.notice.split("[Terms of Use]");
  const [mid, after] = rest.split("[Refund Policy]");

  async function pay() {
    if (busy || !clientKey) return;
    if (loggedIn === false && !isEmail(email.trim())) {
      setErr("Please enter a valid email for your receipt.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const session = await getRealSession();
      const res = await fetch("/api/en/checkout", {
        method: "POST",
        headers: apiHeaders(session, { "content-type": "application/json" }),
        body: JSON.stringify({ resultId, attributionLast: getAttribution()?.last ?? null, ...(loggedIn === false ? { email: email.trim() } : {}) }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409 && d.paid) {
        window.location.replace(`/en/results/${resultId}/${page}`);
        return;
      }
      if (!res.ok || !d.orderId) throw new Error(d.error ?? "We couldn’t start the payment. Please try again.");
      const o = d as Order;
      track("pay_start", { page, from: "en" });
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
      // SDK 타입은 일반 결제를 원화로 적어 두었지만, 해외카드·PayPal은 USD로 계약됨(owner 확인) — 요청 모양은 SDK 문서(PaymentRequest.d.ts)대로
      const request =
        method === "card"
          ? { ...common, method: "CARD", card: { useInternationalCardOnly: true, language: "EN" } }
          : { ...common, method: "FOREIGN_EASY_PAY", foreignEasyPay: { provider: "PAYPAL", country: o.country } };
      await payment.requestPayment(request as never);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      // 사용자가 결제창을 닫은 경우는 오류로 보이지 않게
      if (code !== "USER_CANCEL" && code !== "PAY_PROCESS_CANCELED") setErr(e instanceof Error && /^[\x00-\x7F]*$/.test(e.message) ? e.message : "We couldn’t open the payment window. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="screen on flex flex-col gap-4" lang="en" aria-labelledby="pay-big">
      <Link href={`/en/results/${resultId}/${page}`} className="text-sm text-cream/80 underline">
        ← Back to results
      </Link>
      <h1 className="big" id="pay-big">Unlock your full star report</h1>
      <div className="rounded-2xl border border-gold px-4 py-3 text-cream">
        <p className="font-bold">{EN_PAY_COPY.product}</p>
        <p className="mt-1 text-sm text-cream/80">{EN_PAY_COPY.methods}</p>
      </div>
      <fieldset className="field">
        <legend className="lbl">Payment method</legend>
        <div className="chips">
          {(
            [
              ["card", "Card (Visa · Mastercard · JCB)"],
              ["paypal", "PayPal"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="chip" htmlFor={`pm-${v}`}>
              <input type="radio" name="pay-method" id={`pm-${v}`} value={v} checked={method === v} onChange={() => setMethod(v)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {loggedIn === false && (
        <div className="field">
          <label className="lbl" htmlFor="en-receipt-email">Email for your receipt</label>
          <input id="en-receipt-email" className="auth-input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <p className="hint">We’ll send your order confirmation here. You can also log in to keep your report.</p>
        </div>
      )}
      <p className="text-sm text-cream/90">
        {before}
        <Link href={enLegalUrl("terms")} target="_blank" rel="noopener" className="underline">Terms of Use</Link>
        {mid}
        <Link href={enLegalUrl("refund")} target="_blank" rel="noopener" className="underline">Refund Policy</Link>
        {after}
      </p>
      <p className="err" role="alert">{err}</p>
      {clientKey ? (
        <button type="button" className="btn block" onClick={() => void pay()} disabled={busy} aria-busy={busy}>
          {busy ? "Opening payment…" : EN_PAY_COPY.button}
        </button>
      ) : (
        <>
          <button type="button" className="btn block" disabled aria-disabled="true">
            {EN_PAY_COPY.button}
          </button>
          <p className="hint text-center">Payments for the English site are opening soon. You won’t be charged.</p>
        </>
      )}
    </section>
  );
}
