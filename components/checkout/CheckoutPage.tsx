"use client";

// 결제 화면: 서버가 만든 주문(금액 서버 결정)으로 토스 결제 위젯을 띄운다. 결제가 끝나면 토스가 /checkout/success로 보내고,
// 그 화면이 서버에 승인 확인을 요청한다. 가짜 카운트다운·"지금만 할인" 같은 문구는 쓰지 않는다(디자인가이드 2장).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiHeaders } from "@/lib/guest/client";
import { useRealSession } from "@/components/results/useSession";

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
  const [order, setOrder] = useState<Order | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<Widget | null>(null);

  useEffect(() => {
    if (session === undefined) return;
    // 로그인하지 않아도 결제할 수 있다(비회원 열쇠로 내 결과임을 확인). 결제 뒤 가입을 권한다.
    void fetch("/api/checkout", {
      method: "POST",
      headers: apiHeaders(session, { "content-type": "application/json" }),
      body: JSON.stringify({ resultId }),
    })
      .then(async (res) => {
        const d = await res.json();
        if (res.status === 409 && d.paid) router.replace(`/results/${resultId}/${page}`);
        else if (!res.ok) setError(d.error ?? "주문을 만들지 못했어요.");
        else setOrder(d);
      })
      .catch(() => setError("주문을 만들지 못했어요."));
  }, [session, resultId, router, page]);

  useEffect(() => {
    if (!order || !TOSS_CLIENT_KEY) return;
    let cancelled = false;
    void import("@tosspayments/payment-widget-sdk").then(async ({ loadPaymentWidget }) => {
      const widget = await loadPaymentWidget(TOSS_CLIENT_KEY, order.customerKey);
      if (cancelled) return;
      widget.renderPaymentMethods("#toss-payment-methods", order.amount);
      widget.renderAgreement("#toss-agreement");
      widgetRef.current = widget;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [order]);

  async function pay() {
    if (!order || !widgetRef.current) return;
    setError(null);
    try {
      await widgetRef.current.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${window.location.origin}/checkout/success?page=${page}`,
        failUrl: `${window.location.origin}/checkout/fail?resultId=${resultId}&page=${page}`,
      });
    } catch {
      setError("결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  if (session === undefined) return <p className="text-center text-cream/70">확인하는 중…</p>;

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/results/${resultId}/${page}`} className="text-sm text-cream/80 underline">← 결과로 돌아가기</Link>
      <h1 className="text-xl font-bold text-cream">전체 리포트 결제</h1>
      {order && (
        <div className="rounded-2xl border border-gold px-4 py-3 text-cream">
          <p className="font-bold">{order.orderName}</p>
          <p className="text-sm text-cream/80">{order.amount.toLocaleString()}원 · 쏘웰라 3일 이용권 안내 포함</p>
        </div>
      )}
      {!TOSS_CLIENT_KEY && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">결제 설정이 아직 준비되지 않았어요.</p>}
      {/* 토스 위젯이 그려지는 자리(흰 바탕이 필요해 크림 상자 위에) */}
      <div className="overflow-hidden rounded-2xl bg-white">
        <div id="toss-payment-methods" />
        <div id="toss-agreement" />
      </div>
      {error && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>}
      <button className="w-full rounded-full bg-gold px-6 py-3 font-bold text-navy disabled:opacity-40" disabled={!ready} onClick={pay}>
        {order ? `${order.amount.toLocaleString()}원 결제하기` : "준비하는 중…"}
      </button>
    </div>
  );
}
