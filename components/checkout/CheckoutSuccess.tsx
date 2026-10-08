"use client";

// 토스 결제창에서 돌아온 화면. 받은 값을 서버에 넘겨 '진짜 승인됐는지' 확인받은 뒤 결과 화면으로 간다(리포트는 거기서 기다림).
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getRealSession } from "@/lib/supabase/browser";

export default function CheckoutSuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");
    void (async () => {
      const session = await getRealSession();
      if (!session || !paymentKey || !orderId || !amount) {
        setError("결제 정보를 확인하지 못했어요. 로그인 상태를 확인해 주세요.");
        return;
      }
      const res = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.resultId) router.replace(`/results/${d.resultId}`);
      else setError(d.error ?? "결제를 확인하지 못했어요.");
    })();
  }, [params, router]);

  return (
    <div className="flex flex-col items-center gap-4 text-center text-cream">
      {error ? (
        <>
          <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>
          <p className="text-xs text-cream/70">이미 결제가 됐는데 이 화면이 보이면, 하단 문의 메일로 알려 주세요.</p>
        </>
      ) : (
        <p>결제를 확인하고 있어요…</p>
      )}
    </div>
  );
}
