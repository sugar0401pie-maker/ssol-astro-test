"use client";

// 영문 결제 화면 /en/checkout/{resultId}((나) 영문 전용). 2026-11-04 owner 설정에 맞춰 토스 '결제위젯'으로 연다:
// 한국어판과 같은 결제위젯 키(NEXT_PUBLIC_TOSS_CLIENT_KEY / TOSS_SECRET_KEY) + 결제 UI variantKey 'dollaronly'(외화결제 — 해외카드·PayPal을
// 토스 화면 안에서 고름), 금액은 USD 2.99. 처음엔 'API 개별 연동 키'로 결제창을 직접 열었지만 토스가 '계약된 곳이 아닙니다'로 거절했다 —
// 해외결제 설정이 그 키가 아니라 결제위젯 쪽(dollaronly UI)에 되어 있어서. 화면에 들어오면 토스 결제 UI가 바로 그려진다.
// 금액·주문은 서버(/api/en/checkout)가 정하고, 승인은 /en/checkout/success → /api/en/checkout/confirm에서 서버가 확인한다.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/track";
import { enLegalUrl } from "@/lib/legal/en/blocks";
import { EN_CURRENCY, EN_REPORT_PRICE_CENTS, centsToUsd, enTossClientKey, tossKeyKind, type EnPayMethod } from "@/lib/billing/pricingEn";
import { startEnPayment } from "@/lib/billing/enPayClient";
import { apiHeaders } from "@/lib/guest/client";
import { getAttribution } from "@/lib/attribution/client";
import { useRealSession } from "@/components/results/useSession";

export const EN_PAY_COPY = {
  product: "Star report — US$2.99, one-time payment. No subscription, no automatic renewal.",
  notice:
    "Your report unlocks right after payment. By paying, you ask us to deliver it now and agree that you can't cancel once it is shown, as set out in the [Terms of Use] and [Refund Policy].",
  button: "Pay US$2.99 and get my report now",
  methods: "Visa · Mastercard · JCB · PayPal. Your bank may add a foreign-transaction fee.",
} as const;

// 해외결제 상점 키가 있으면 그것, 없으면 한국어판 결제위젯 키(2026-11-06 — 원화 상점 키로는 2003)
const TOSS_CLIENT_KEY = enTossClientKey();
/** 결제위젯 키면 위젯, API 개별 연동 키면 결제창을 바로 연다 */
const KEY_KIND = tossKeyKind(TOSS_CLIENT_KEY);
/** 토스 결제 어드민의 외화결제 UI(owner 설정 2026-11-04) */
const EN_VARIANT = process.env.NEXT_PUBLIC_TOSS_EN_VARIANT || "dollaronly";

type Widgets = ReturnType<Awaited<ReturnType<typeof import("@tosspayments/tosspayments-sdk")["loadTossPayments"]>>["widgets"]>;

export default function CheckoutEn({ resultId, page }: { resultId: string; page: number }) {
  const session = useRealSession();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const widgetsRef = useRef<Widgets | null>(null);

  useEffect(() => {
    track("pay_click", { page, from: "en" }, `pay_click:${resultId}`);
  }, [resultId, page]);

  // 들어오자마자 토스 결제 UI(외화결제)를 그린다
  useEffect(() => {
    if (session === undefined || !TOSS_CLIENT_KEY || KEY_KIND !== "widget") return;
    let cancelled = false;
    void (async () => {
      try {
        const { loadTossPayments, ANONYMOUS } = await import("@tosspayments/tosspayments-sdk");
        const toss = await loadTossPayments(TOSS_CLIENT_KEY);
        const widgets = toss.widgets({ customerKey: session?.user?.id ?? ANONYMOUS });
        await widgets.setAmount({ currency: EN_CURRENCY, value: centsToUsd(EN_REPORT_PRICE_CENTS) });
        await widgets.renderPaymentMethods({ selector: "#toss-en-methods", variantKey: EN_VARIANT });
        if (cancelled) return;
        widgetsRef.current = widgets;
        setReady(true);
        // 약관 UI는 결제 수단과 따로 — 외화결제 UI에 맞는 약관 UI가 없어도 결제 버튼은 쓸 수 있게(실패해도 무시)
        void widgets.renderAgreement({ selector: "#toss-en-agreement" }).catch(() => undefined);
      } catch (e) {
        const x = e as { code?: string; message?: string };
        if (!cancelled) setErr(`We couldn’t load the payment window.${x?.code ? ` (${x.code}${x.message ? `: ${x.message}` : ""})` : ""}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function pay() {
    if (!widgetsRef.current || busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/en/checkout", {
        method: "POST",
        headers: apiHeaders(session, { "content-type": "application/json" }),
        body: JSON.stringify({ resultId, attributionLast: getAttribution()?.last ?? null }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409 && d.paid) return window.location.replace(`/en/results/${resultId}/${page}`);
      if (!res.ok || !d.orderId) throw new Error(d.error ?? "We couldn’t start the payment. Please try again.");
      track("pay_start", { page, from: "en" });
      const origin = window.location.origin;
      await widgetsRef.current.requestPayment({
        orderId: d.orderId,
        orderName: d.orderName,
        successUrl: `${origin}/en/checkout/success?page=${page}`,
        failUrl: `${origin}/en/checkout/fail?resultId=${resultId}&page=${page}`,
      });
    } catch (e) {
      const x = e as { code?: string; message?: string };
      if (x?.code !== "USER_CANCEL" && x?.code !== "PAY_PROCESS_CANCELED") setErr(x?.code ? `${x.message ?? "Payment failed."} (${x.code})` : (x?.message ?? "Payment failed."));
    } finally {
      setBusy(false);
    }
  }

  async function payWindow(method: EnPayMethod) {
    if (busy) return;
    setBusy(true);
    setErr("");
    const e = await startEnPayment(resultId, page, method);
    if (e) setErr(e);
    setBusy(false);
  }

  const [before, rest] = EN_PAY_COPY.notice.split("[Terms of Use]");
  const [mid, after] = rest.split("[Refund Policy]");
  return (
    <section className="screen on flex flex-col gap-4" lang="en" aria-labelledby="pay-big">
      <Link href={`/en/results/${resultId}/${page}`} className="text-sm text-cream/80 underline">
        ← Back to my reading
      </Link>
      {!TOSS_CLIENT_KEY && <p className="err">Payments aren’t available right now. You won’t be charged.</p>}
      {/* 토스 결제 UI가 그려지는 자리(흰 바탕) */}
      {KEY_KIND === "widget" && <div className="overflow-hidden rounded-2xl bg-white">
        <div id="toss-en-methods" />
        <div id="toss-en-agreement" />
      </div>}
      <p className="text-xs text-cream/80">
        {before}
        <Link href={enLegalUrl("terms")} target="_blank" rel="noopener" className="underline">Terms of Use</Link>
        {mid}
        <Link href={enLegalUrl("refund")} target="_blank" rel="noopener" className="underline">Refund Policy</Link>
        {after}
      </p>
      <p className="err" role="alert">{err}</p>
      {KEY_KIND === "api" ? (
        <>
          <button type="button" className="btn block" onClick={() => void payWindow("card")} disabled={busy} aria-busy={busy}>
            {EN_PAY_COPY.button}
          </button>
          <button type="button" className="btn ghost block" onClick={() => void payWindow("paypal")} disabled={busy}>
            Pay with PayPal
          </button>
        </>
      ) : (
        <button type="button" className="btn block" onClick={() => void pay()} disabled={!ready || busy} aria-busy={busy}>
          {ready ? "Pay US$2.99" : "Opening secure payment…"}
        </button>
      )}
    </section>
  );
}
