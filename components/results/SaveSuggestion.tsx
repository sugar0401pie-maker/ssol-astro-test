"use client";

// 비회원에게 저장(가입·로그인)을 권하는 카드. owner 결정(2026-10-08): 결과를 먼저 보여 주고 저장은 권한다 — 막지 않는다.
// 가입·로그인하면 이 브라우저의 비회원 결과·주문이 계정으로 옮겨진다(claimGuestResults).
import { useState } from "react";
import AuthStep from "@/components/auth/AuthStep";
import { claimGuestResults } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";

export default function SaveSuggestion({
  resultId,
  paid = false,
  prefill,
  onSaved,
}: {
  resultId: string | null;
  /** 결제 후에는 가입을 더 분명히 권한다(쏘웰라 3일 이용권도 계정이 있어야 쓸 수 있음) */
  paid?: boolean;
  prefill?: { birthDate?: string; nickname?: string };
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(paid);
  const [saved, setSaved] = useState(false);

  async function afterSignIn() {
    const s = await getRealSession();
    if (s) await claimGuestResults(s);
    setSaved(true);
    setOpen(false);
    onSaved?.();
  }

  if (saved) return <p className="rounded-2xl border border-gold px-4 py-3 text-center text-sm text-cream">계정에 저장했어요. 이제 어느 기기에서든 &lsquo;내 결과&rsquo;에서 다시 볼 수 있어요.</p>;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gold px-4 py-4 text-cream">
      <p className="font-bold">{paid ? "결제가 완료됐어요. 가입하고 리포트를 보관해 주세요." : "이 결과는 아직 이 기기에만 저장돼 있어요."}</p>
      <p className="text-sm leading-relaxed text-cream/85">
        {paid
          ? "가입하면 이 리포트가 계정에 저장되고, 쏘웰라 3일 이용권도 쓸 수 있어요. 가입하지 않으면 1년 뒤 자동으로 지워져요."
          : "가입하거나 로그인하면 어느 기기에서든 다시 볼 수 있어요. 저장하지 않으면 30일 뒤 자동으로 지워져요."}
      </p>
      {!open ? (
        <button type="button" className="w-full rounded-full bg-gold px-6 py-3 font-bold text-navy" onClick={() => setOpen(true)}>
          {paid ? "가입하고 보관하기" : "로그인하고 저장하기"}
        </button>
      ) : (
        <AuthStep
          title="쏠 웰니스 하우스 계정으로 저장해요."
          initialMode={paid ? "signup" : "signin"}
          oauthRedirect={typeof window !== "undefined" && resultId ? `${window.location.origin}/results/${resultId}` : undefined}
          prefill={prefill}
          onSignedIn={() => void afterSignIn()}
        />
      )}
    </div>
  );
}
