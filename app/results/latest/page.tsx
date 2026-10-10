import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import LatestResult from "@/components/results/LatestResult";

export const metadata: Metadata = { title: "쏠 아스트로 하우스 — 내 결과" };

export default function LatestResultPage() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7">
      <LatestResult />
      <AuthFooterLink />
      <SiteFooter />
    </main>
  );
}
