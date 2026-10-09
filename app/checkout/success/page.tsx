import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutSuccess from "@/components/checkout/CheckoutSuccess";

export const metadata: Metadata = { title: "쏠 아스트로 하우스 — 결제" };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <Suspense fallback={null}>
        <CheckoutSuccess />
      </Suspense>
    </main>
  );
}
