import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import ResultView from "@/components/results/ResultView";

export const metadata: Metadata = { title: "쏠 아스트로 하우스 — 결과" };

export default async function ResultPage({ params }: PageProps<"/results/[id]">) {
  const { id } = await params;
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7">
      <ResultView id={id} />
      <AuthFooterLink />
      <SiteFooter />
    </main>
  );
}
