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
import type { EnPayMethod } from "@/lib/billing/pricingEn";
import { startEnPayment } from "@/lib/billing/enPayClient";

export const EN_PAY_COPY = {
  product: "Star report — US$2.99, one-time payment. No subscription, no automatic renewal.",
  notice:
    "Your report unlocks right after payment. By paying, you ask us to deliver it now and agree that you can't cancel once it is shown, as set out in the [Terms of Use] and [Refund Policy].",
  button: "Pay US$2.99 and get my report now",
  methods: "Visa · Mastercard · JCB · PayPal. Your bank may add a foreign-transaction fee.",
} as const;

export default function CheckoutEn({ resultId, page }: { resultId: string; page: number }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    track("pay_click", { page, from: "en" }, `pay_click:${resultId}`);
  }, [resultId, page]);
  const [before, rest] = EN_PAY_COPY.notice.split("[Terms of Use]");
  const [mid, after] = rest.split("[Refund Policy]");
  async function go(method: EnPayMethod) {
    if (busy) return;
    setBusy(true);
    setErr("");
    const e = await startEnPayment(resultId, page, method);
    if (e) setErr(e);
    setBusy(false);
  }
  return (
    <section className="screen on flex flex-col gap-4" lang="en" aria-labelledby="pay-big">
      <Link href={`/en/results/${resultId}/${page}`} className="text-sm text-cream/80 underline">
        ← Back to results
      </Link>
      <h1 className="big" id="pay-big">Unlock your full star report</h1>
      <p className="text-sm text-cream/80">
        {before}
        <Link href={enLegalUrl("terms")} target="_blank" rel="noopener" className="underline">Terms of Use</Link>
        {mid}
        <Link href={enLegalUrl("refund")} target="_blank" rel="noopener" className="underline">Refund Policy</Link>
        {after}
      </p>
      <p className="err" role="alert">{err}</p>
      <button type="button" className="btn block" onClick={() => void go("card")} disabled={busy} aria-busy={busy}>
        {EN_PAY_COPY.button}
      </button>
      <button type="button" className="btn ghost block" onClick={() => void go("paypal")} disabled={busy}>
        Pay with PayPal
      </button>
    </section>
  );
}
