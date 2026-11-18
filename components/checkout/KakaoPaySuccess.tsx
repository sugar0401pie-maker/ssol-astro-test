"use client";

// 카카오페이 결제에서 돌아온 화면(owner 2026-11-18): pg_token을 서버에 넘겨 승인·금액 확인을 받은 뒤 결제를 누른 결과 페이지로.
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiHeaders } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";
import { clampPage } from "@/lib/results/lastPage";
import { track } from "@/lib/analytics/track";
import { gaPurchase } from "@/lib/analytics/gaClient";
import { xPixelEvent } from "@/lib/x/pixelClient";
import { X_EVENT_IDS } from "@/lib/x/events";

export default function KakaoPaySuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [goResult, setGoResult] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const orderId = params.get("orderId");
    const pgToken = params.get("pg_token");
    const page = clampPage(params.get("page"));
    void (async () => {
      if (!orderId || !pgToken) {
        setError("결제 정보를 확인하지 못했어요.");
        return;
      }
      const session = await getRealSession();
      const res = await fetch("/api/checkout/kakaopay/approve", {
        method: "POST",
        headers: apiHeaders(session, { "content-type": "application/json" }),
        body: JSON.stringify({ orderId, pgToken }),
      });
      const d = await res.json().catch(() => ({}));
      track(res.ok ? "pay_success" : "pay_fail", { page, method: "kakaopay" });
      if (res.ok) {
        const amount = typeof d.amount === "number" ? d.amount : 0;
        if (amount) {
          gaPurchase(orderId, amount);
          xPixelEvent(X_EVENT_IDS.purchase, {
            conversion_id: orderId,
            value: amount,
            currency: "KRW",
            contents: [{ content_type: "digital_report", content_id: "astro_report", content_name: "쏠 아스트로 하우스 전체 리포트", content_price: amount, num_items: 1 }],
          });
        }
      }
      if (res.ok && d.resultId) router.replace(`/results/${d.resultId}/${page}`);
      else {
        setError(d.error ?? "결제를 확인하지 못했어요.");
        if (res.status === 409 && d.resultId) setGoResult(`/results/${d.resultId}/${page}`);
        setCanRetry(res.status === 503);
      }
    })();
  }, [params, router]);

  return (
    <div className="flex flex-col items-center gap-4 text-center text-cream">
      {error ? (
        <>
          <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>
          {goResult && (
            <button type="button" className="btn block" onClick={() => router.replace(goResult)}>
              결과로 돌아가기
            </button>
          )}
          {canRetry && (
            <button type="button" className="btn block" onClick={() => window.location.reload()}>
              결제 다시 확인하기
            </button>
          )}
          <p className="text-xs text-cream/70">이미 결제가 됐는데 이 화면이 보이면, 결제한 기기·브라우저에서 다시 열어 보시거나 하단 문의 메일로 알려 주세요.</p>
        </>
      ) : (
        <p>결제를 확인하고 있어요…</p>
      )}
    </div>
  );
}
