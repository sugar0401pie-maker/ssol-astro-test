"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function CheckoutFail() {
  const params = useSearchParams();
  const resultId = params.get("resultId");
  const message = params.get("message");
  return (
    <div className="flex flex-col gap-4 text-cream">
      <h1 className="text-xl font-bold">결제가 완료되지 않았어요</h1>
      {message && <p className="text-sm text-cream/80">{message}</p>}
      <p className="text-sm text-cream/80">결제 금액은 청구되지 않았어요. 다시 시도하실 수 있어요.</p>
      {resultId && (
        <Link href={`/checkout/${resultId}`} className="w-full rounded-full bg-gold px-6 py-3 text-center font-bold text-navy">
          다시 결제하기
        </Link>
      )}
      <Link href={resultId ? `/results/${resultId}` : "/results"} className="text-center text-sm underline">결과로 돌아가기</Link>
    </div>
  );
}
