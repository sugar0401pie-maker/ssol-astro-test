import type { Metadata } from "next";
import CheckoutPage from "@/components/checkout/CheckoutPage";
import { clampPage } from "@/lib/results/lastPage";

export const metadata: Metadata = { title: "쏠 아스트로 하우스 — 결제" };

export default async function Checkout({ params, searchParams }: PageProps<"/checkout/[resultId]">) {
  const { resultId } = await params;
  // 결제를 누른 결과 페이지 번호(마스터스펙 6-1-1 '결제 성공 콜백 주소에 페이지 번호') — 결제 후 그 페이지로 돌아간다
  const page = clampPage((await searchParams).page);
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7">
      <CheckoutPage resultId={resultId} page={page} />
    </main>
  );
}
