"use client";

// 영문 결제 화면 /en/checkout/{resultId}((나) 영문 전용, owner 2026-11-04). 문구는 영문 정책 08_on-screen-texts §4 그대로
// (청약철회 포기는 약관에 두고 버튼 바로 위에 안내만 — 체크박스 아님).
// 결제는 한국어판(토스 결제위젯, 원화)과 다른 별도 연동이다: 토스 해외카드(VISA·MASTER·JCB, USD) + PayPal(토스 해외간편결제).
// 아직 열지 않는다 — ① 해외 결제용 키(NEXT_PUBLIC_TOSS_EN_CLIENT_KEY·TOSS_EN_SECRET_KEY) ② 영문 유료 리포트(영문 AI 지시문·검증기)가
// 생기기 전에 결제를 받으면 산 사람에게 줄 영문 리포트가 없어서다. 둘이 준비되면 결제 요청·승인 API를 붙인다.
import Link from "next/link";
import { useEffect } from "react";
import { track } from "@/lib/analytics/track";
import { enLegalUrl } from "@/lib/legal/en/blocks";

export const EN_PAY_COPY = {
  product: "Star report — US$2.99, one-time payment. No subscription, no automatic renewal.",
  notice:
    "Your report unlocks right after payment. By paying, you ask us to deliver it now and agree that you can't cancel once it is shown, as set out in the [Terms of Use] and [Refund Policy].",
  button: "Pay US$2.99 and get my report now",
  methods: "Visa · Mastercard · JCB · PayPal. Your bank may add a foreign-transaction fee.",
} as const;

export default function CheckoutEn({ resultId, page }: { resultId: string; page: number }) {
  useEffect(() => {
    track("pay_click", { page, from: "en" }, `pay_click:${resultId}`);
  }, [resultId, page]);
  const [before, rest] = EN_PAY_COPY.notice.split("[Terms of Use]");
  const [mid, after] = rest.split("[Refund Policy]");
  return (
    <section className="screen on flex flex-col gap-4" lang="en" aria-labelledby="pay-big">
      <Link href={`/en/results/${resultId}/${page}`} className="text-sm text-cream/80 underline">
        ← Back to results
      </Link>
      <h1 className="big" id="pay-big">Unlock your full star report</h1>
      <div className="rounded-2xl border border-gold px-4 py-3 text-cream">
        <p className="font-bold">{EN_PAY_COPY.product}</p>
        <p className="mt-1 text-sm text-cream/80">{EN_PAY_COPY.methods}</p>
      </div>
      <p className="text-sm text-cream/90">
        {before}
        <Link href={enLegalUrl("terms")} target="_blank" rel="noopener" className="underline">Terms of Use</Link>
        {mid}
        <Link href={enLegalUrl("refund")} target="_blank" rel="noopener" className="underline">Refund Policy</Link>
        {after}
      </p>
      {/* 해외 결제 연동 전: 버튼은 보이되 눌리지 않는다(Claude 초안 안내 — 원어민 검수 대상) */}
      <button type="button" className="btn block" disabled aria-disabled="true">
        {EN_PAY_COPY.button}
      </button>
      <p className="hint text-center">Payments for the English site are opening soon. You won’t be charged.</p>
    </section>
  );
}
