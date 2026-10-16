"use client";

// 토스 결제창에서 돌아온 화면. 받은 값을 서버에 넘겨 '진짜 승인됐는지' 확인받은 뒤 결제를 누른 결과 페이지로 간다(리포트는 거기서 기다림).
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiHeaders } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";
import { b14, useCopy } from "@/lib/copy/useCopy";
import { clampPage } from "@/lib/results/lastPage";
import { track } from "@/lib/analytics/track";
import { gaPurchase } from "@/lib/analytics/gaClient";
import { xPixelEvent } from "@/lib/x/pixelClient";
import { X_EVENT_IDS } from "@/lib/x/events";

export default function CheckoutSuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const copy = useCopy();
  const [error, setError] = useState<string | null>(null);
  // 이미 결제된 결과(409)면 그 결과로 가는 버튼, 확인이 늦어지면(503) 다시 확인 버튼
  const [goResult, setGoResult] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");
    void (async () => {
      const session = await getRealSession();
      if (!paymentKey || !orderId || !amount) {
        setError("결제 정보를 확인하지 못했어요.");
        return;
      }
      const res = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: apiHeaders(session, { "content-type": "application/json" }),
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
      });
      const d = await res.json().catch(() => ({}));
      // 결제를 누른 그 페이지로 바로(프로토타입 unlock — 비회원이면 그 페이지 맨 위에 보관 안내가 뜬다)
      track(res.ok ? "pay_success" : "pay_fail", { page: clampPage(params.get("page")) });
      // GA4 purchase: 서버가 금액·주문을 확인한 결제만(같은 주문 번호는 GA가 한 번만 센다)
      if (res.ok) {
        gaPurchase(orderId, Number(amount));
        // X 픽셀 결제 전환 — 서버 전환 API와 같은 conversion_id(주문 번호)
        xPixelEvent(X_EVENT_IDS.purchase, {
          conversion_id: orderId,
          value: Number(amount),
          currency: "KRW",
          contents: [{ content_type: "digital_report", content_id: "astro_report", content_name: "쏠 아스트로 하우스 전체 리포트", content_price: Number(amount), num_items: 1 }],
        });
      }
      if (res.ok && d.resultId) router.replace(`/results/${d.resultId}/${clampPage(params.get("page"))}`);
      else {
        setError(d.error ?? "결제를 확인하지 못했어요.");
        if (res.status === 409 && d.resultId) setGoResult(`/results/${d.resultId}/${clampPage(params.get("page"))}`);
        setCanRetry(res.status === 503);
      }
    })();
  }, [params, router]);

  return (
    <div className="flex flex-col items-center gap-4 text-center text-cream">
      {error ? (
        <>
          <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>
          {goResult ? (
            <button type="button" className="btn block" onClick={() => router.replace(goResult)}>
              결과로 돌아가기
            </button>
          ) : null}
          {canRetry ? (
            <button type="button" className="btn block" onClick={() => window.location.reload()}>
              결제 다시 확인하기
            </button>
          ) : null}
          <p className="text-xs text-cream/70">이미 결제가 됐는데 이 화면이 보이면, 결제한 기기·브라우저에서 다시 열어 보시거나 하단 문의 메일로 알려 주세요.</p>
        </>
      ) : (
        <p>{b14(copy, "ERR_PAY_PENDING", "title", "결제를 확인하고 있어요…")}</p>
      )}
    </div>
  );
}
