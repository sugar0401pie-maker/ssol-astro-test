import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutSuccess from "@/components/checkout/CheckoutSuccess";

export const metadata: Metadata = { title: "쏠 아스트로 하우스 — 결제" };

export default function Page() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7">
      <Suspense fallback={null}>
        <CheckoutSuccess />
      </Suspense>
    </main>
  );
}
