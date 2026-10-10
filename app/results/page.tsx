import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import ResultsList from "@/components/results/ResultsList";

export const metadata: Metadata = { title: "쏠 아스트로 하우스 — 내 결과" };

export default function ResultsPage() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7">
      <ResultsList />
      <AuthFooterLink />
      <SiteFooter />
    </main>
  );
}
