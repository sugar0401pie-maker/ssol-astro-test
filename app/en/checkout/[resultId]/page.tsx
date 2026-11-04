import type { Metadata } from "next";
import CheckoutEn from "@/components/en/CheckoutEn";
import SiteFooterEn from "@/components/SiteFooterEn";

export const metadata: Metadata = { title: "Checkout — SSOL Astro House", robots: { index: false, follow: false } };

export default async function CheckoutEnPage({ params, searchParams }: PageProps<"/en/checkout/[resultId]">) {
  const { resultId } = await params;
  const sp = await searchParams;
  const n = Number(typeof sp.page === "string" ? sp.page : 4);
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7" lang="en">
      <CheckoutEn resultId={resultId} page={Number.isInteger(n) && n >= 1 && n <= 7 ? n : 4} />
      <SiteFooterEn />
    </main>
  );
}
