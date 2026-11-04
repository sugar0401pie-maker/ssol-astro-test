import type { Metadata } from "next";
import SiteFooterEn from "@/components/SiteFooterEn";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import ResultsListEn from "@/components/en/ResultsListEn";

export const metadata: Metadata = { title: "My results — SSOL Astro House", robots: { index: false, follow: false } };

export default function ResultsEnPage() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7" lang="en">
      <ResultsListEn />
      <AuthFooterLink lang="en" />
      <SiteFooterEn />
    </main>
  );
}
