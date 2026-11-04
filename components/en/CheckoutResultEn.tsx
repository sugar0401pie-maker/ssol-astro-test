"use client";

// 영문 결제창에서 돌아온 화면((나), 2026-11-04). success: 받은 값을 서버에 넘겨 승인을 확인받은 뒤 결과 페이지로(리포트는 거기서 기다림).
// fail: 사용자 취소면 '멈춤', 그 밖은 '청구되지 않음' 안내. 문구는 Claude 초안(원어민 검수 대상).
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiHeaders } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";
import { clampPage } from "@/lib/results/lastPage";
import { track } from "@/lib/analytics/track";
import { gaPurchase } from "@/lib/analytics/gaClient";

export function CheckoutSuccessEn() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [goResult, setGoResult] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const sent = useRef(false);
  const page = clampPage(params.get("page"));

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");
    void (async () => {
      if (!paymentKey || !orderId || !amount) {
        setError("We couldn’t read your payment details.");
        return;
      }
      const session = await getRealSession();
      const res = await fetch("/api/en/checkout/confirm", {
        method: "POST",
        headers: apiHeaders(session, { "content-type": "application/json" }),
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
      });
      const d = await res.json().catch(() => ({}));
      track(res.ok ? "pay_success" : "pay_fail", { page, from: "en" });
      // GA는 영문 화면에서 분석 쿠키 동의가 있을 때만 보낸다(gaClient가 확인)
      if (res.ok) gaPurchase(orderId, Number(amount), "USD");
      if (res.ok && d.resultId) router.replace(`/en/results/${d.resultId}/${page}`);
      else {
        setError(d.error ?? "We couldn’t confirm your payment.");
        if (res.status === 409 && d.resultId) setGoResult(`/en/results/${d.resultId}/${page}`);
        setCanRetry(res.status === 503);
      }
    })();
  }, [params, router, page]);

  return (
    <div className="flex flex-col items-center gap-4 text-center text-cream" lang="en">
      {error ? (
        <>
          <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>
          {goResult && (
            <button type="button" className="btn block" onClick={() => router.replace(goResult)}>
              Back to my results
            </button>
          )}
          {canRetry && (
            <button type="button" className="btn block" onClick={() => window.location.reload()}>
              Check my payment again
            </button>
          )}
          <p className="text-xs text-cream/70">If you were charged but still see this page, open it again on the same device and browser, or email contact@ssolwellness.com.</p>
        </>
      ) : (
        <p className="big">Confirming your payment…</p>
      )}
    </div>
  );
}

const CANCEL_CODES = new Set(["PAY_PROCESS_CANCELED", "USER_CANCEL"]);

export function CheckoutFailEn() {
  const params = useSearchParams();
  const resultId = params.get("resultId");
  const page = clampPage(params.get("page"));
  const cancel = CANCEL_CODES.has(params.get("code") ?? "");
  useEffect(() => track("pay_fail", { page, from: cancel ? "cancel" : "error" }, "pay_fail"), [page, cancel]);
  const retry = resultId ? `/en/checkout/${resultId}?page=${page}` : null;
  return (
    <div className="flex flex-col gap-4 text-cream" lang="en">
      <h1 className="big">{cancel ? "Payment stopped" : "Your payment didn’t go through"}</h1>
      <p className="small">{cancel ? "Everything you’ve seen so far is still here." : "You haven’t been charged. You can try again."}</p>
      {retry && !cancel && (
        <Link href={retry} className="btn block">
          Try again
        </Link>
      )}
      <Link href={resultId ? `/en/results/${resultId}/${page}` : "/en/results"} className={cancel ? "btn block" : "linkish text-center"}>
        Back to my results
      </Link>
      {retry && cancel && (
        <Link href={retry} className="linkish text-center">
          Try again
        </Link>
      )}
    </div>
  );
}
