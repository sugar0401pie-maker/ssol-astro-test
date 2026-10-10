import type { Metadata } from "next";
import CheckoutPage from "@/components/checkout/CheckoutPage";

export const metadata: Metadata = { title: "쏠 아스트로 하우스 — 결제" };

export default async function Checkout({ params }: PageProps<"/checkout/[resultId]">) {
  const { resultId } = await params;
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7">
      <CheckoutPage resultId={resultId} />
    </main>
  );
}
