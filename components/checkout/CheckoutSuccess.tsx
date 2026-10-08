"use client";

// 토스 결제창에서 돌아온 화면. 받은 값을 서버에 넘겨 '진짜 승인됐는지' 확인받은 뒤 결과 화면으로 간다(리포트는 거기서 기다림).
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SaveSuggestion from "@/components/results/SaveSuggestion";
import { apiHeaders } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";

export default function CheckoutSuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // 비회원 결제: 결과로 가기 전에 가입을 권한다(owner 결정 — 결제 후에 실제로 가입). 건너뛸 수도 있다.
  const [guestPaid, setGuestPaid] = useState<string | null>(null);
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
      if (res.ok && d.resultId && d.guest) setGuestPaid(d.resultId);
      else if (res.ok && d.resultId) router.replace(`/results/${d.resultId}`);
      else setError(d.error ?? "결제를 확인하지 못했어요.");
    })();
  }, [params, router]);

  if (guestPaid)
    return (
      <div className="flex flex-col gap-4 text-cream">
        <SaveSuggestion resultId={guestPaid} paid onSaved={() => router.replace(`/results/${guestPaid}`)} />
        <button type="button" className="text-center text-sm underline" onClick={() => router.replace(`/results/${guestPaid}`)}>
          나중에 할게요 — 리포트 먼저 보기
        </button>
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-4 text-center text-cream">
      {error ? (
        <>
          <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>
          <p className="text-xs text-cream/70">이미 결제가 됐는데 이 화면이 보이면, 결제한 기기·브라우저에서 다시 열어 보시거나 하단 문의 메일로 알려 주세요.</p>
        </>
      ) : (
        <p>결제를 확인하고 있어요…</p>
      )}
    </div>
  );
}
