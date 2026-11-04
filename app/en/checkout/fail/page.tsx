import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutFailEn } from "@/components/en/CheckoutResultEn";
import SiteFooterEn from "@/components/SiteFooterEn";

export const metadata: Metadata = { title: "Checkout — SSOL Astro House", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7" lang="en">
      <Suspense fallback={null}>
        <CheckoutFailEn />
      </Suspense>
      <SiteFooterEn />
    </main>
  );
}
