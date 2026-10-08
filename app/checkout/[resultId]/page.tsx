import type { Metadata } from "next";
import CheckoutPage from "@/components/checkout/CheckoutPage";

export const metadata: Metadata = { title: "쏠 점성술 하우스 — 결제" };

export default async function Checkout({ params }: PageProps<"/checkout/[resultId]">) {
  const { resultId } = await params;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <CheckoutPage resultId={resultId} />
    </main>
  );
}
