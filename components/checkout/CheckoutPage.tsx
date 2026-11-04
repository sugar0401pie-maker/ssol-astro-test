"use client";

// 결제 화면: 서버가 만든 주문(금액 서버 결정)으로 토스 결제 위젯을 띄운다. 결제가 끝나면 토스가 /checkout/success로 보내고,
// 그 화면이 서버에 승인 확인을 요청한다. 가짜 카운트다운·"지금만 할인" 같은 문구는 쓰지 않는다(디자인가이드 2장).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiHeaders } from "@/lib/guest/client";
import { useRealSession } from "@/components/results/useSession";
import { track } from "@/lib/analytics/track";
import { WITHDRAWAL_CHECK_LABEL, WITHDRAWAL_NOTICE_LINES } from "@/lib/billing/withdrawal";
import { getAttribution } from "@/lib/attribution/client";
import { REPORT_PRICE } from "@/lib/billing/pricing";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

interface Order {
  orderId: string;
  orderName: string;
  amount: number;
  customerKey: string;
}

type Widget = Awaited<ReturnType<typeof import("@tosspayments/payment-widget-sdk")["loadPaymentWidget"]>>;

export default function CheckoutPage({ resultId, page }: { resultId: string; page: number }) {
  const router = useRouter();
  const session = useRealSession();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const widgetRef = useRef<Widget | null>(null);
  // 청약철회 제한 사전 고지 동의(약관 제13조 2항) — 결제 버튼 바로 위 한 줄. 체크해야 주문을 만들고 결제로 넘어간다
  const [ack, setAck] = useState(false);

  useEffect(() => {
    track("pay_click", { page }, `pay_click:${resultId}`);
  }, [resultId, page]);

  // 화면을 열자마자 토스 결제 수단을 그린다(owner 2026-11-04 '결제창 바로 뜨게'). 금액은 표시용이고,
  // 실제 청구 금액은 결제 버튼을 누를 때 서버가 만든 주문 금액이다(토스 승인 때 서버가 다시 맞춰 봄).
  useEffect(() => {
    if (session === undefined || !TOSS_CLIENT_KEY) return;
    let cancelled = false;
    const customerKey = session?.user?.id ?? "@@ANONYMOUS";
    void import("@tosspayments/payment-widget-sdk").then(async ({ loadPaymentWidget }) => {
      const widget = await loadPaymentWidget(TOSS_CLIENT_KEY, customerKey);
      if (cancelled) return;
      widget.renderPaymentMethods("#toss-payment-methods", REPORT_PRICE);
      widget.renderAgreement("#toss-agreement");
      widgetRef.current = widget;
      setReady(true);
    }).catch(() => {
      if (!cancelled) setError("결제창을 불러오지 못했어요. 인터넷 연결을 확인하고 이 화면을 새로고침해 주세요.");
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function pay() {
    if (!widgetRef.current || busy) return;
    if (!ack) {
      setError("결제 전 안내에 동의해 주세요.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: apiHeaders(session, { "content-type": "application/json" }),
        body: JSON.stringify({ resultId, withdrawalAck: true, attributionLast: getAttribution()?.last ?? null }),
      });
      const d = (await res.json().catch(() => ({}))) as Partial<Order> & { error?: string; paid?: boolean };
      if (res.status === 409 && d.paid) return router.replace(`/results/${resultId}/${page}`);
      if (!res.ok || !d.orderId) throw new Error(d.error ?? "주문을 만들지 못했어요.");
      // 서버 금액이 화면 금액과 다르면(가격 변경 직후 등) 위젯 금액을 맞춘다
      if (typeof d.amount === "number" && d.amount !== REPORT_PRICE) widgetRef.current.renderPaymentMethods("#toss-payment-methods", d.amount);
      track("pay_start", { page });
      await widgetRef.current.requestPayment({
        orderId: d.orderId,
        orderName: d.orderName ?? "",
        successUrl: `${window.location.origin}/checkout/success?page=${page}`,
        failUrl: `${window.location.origin}/checkout/fail?resultId=${resultId}&page=${page}`,
      });
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err?.code !== "USER_CANCEL" && err?.code !== "PAY_PROCESS_CANCELED") setError(err?.message || "결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (session === undefined) return <p className="text-center text-cream/70">확인하는 중…</p>;

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/results/${resultId}/${page}`} className="text-sm text-cream/80 underline">← 결과로 돌아가기</Link>
      {!TOSS_CLIENT_KEY && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">결제 설정이 아직 준비되지 않았어요.</p>}
      {/* 토스 위젯이 그려지는 자리(흰 바탕이 필요해 크림 상자 위에) */}
      <div className="overflow-hidden rounded-2xl bg-white">
        <div id="toss-payment-methods" />
        <div id="toss-agreement" />
      </div>
      {/* 결제 전 청약철회 안내(약관 제13조) — 한 줄 체크 + 펼쳐 보기 */}
      <div className="text-sm text-cream/90">
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>{WITHDRAWAL_CHECK_LABEL}</span>
        </label>
        <button type="button" className="mt-1 text-xs text-cream/70 underline" onClick={() => setShowNotice((v) => !v)}>
          {showNotice ? "안내 접기" : "안내 보기"}
        </button>
        {showNotice && (
          <div className="mt-2 text-xs text-cream/80">
            {WITHDRAWAL_NOTICE_LINES.map((l) => (
              <p key={l} className="mb-1">{l}</p>
            ))}
            <Link href="/legal#terms" target="_blank" className="underline">이용약관 제13조(청약철회 및 환불) 보기</Link>
          </div>
        )}
      </div>
      {error && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>}
      <button className="w-full rounded-full bg-gold px-6 py-3 font-bold text-navy disabled:opacity-40" disabled={!ready || busy} onClick={() => void pay()}>
        {ready ? `${REPORT_PRICE.toLocaleString()}원 결제하기` : "결제창을 여는 중…"}
      </button>
    </div>
  );
}
