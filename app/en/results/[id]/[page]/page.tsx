import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooterEn from "@/components/SiteFooterEn";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import ResultViewEn from "@/components/en/ResultViewEn";
import { RESULT_PAGES } from "@/lib/results/lastPage";

// 영문 결과 페이지(한국어 /results/{id}/{n}와 같은 구조). 본인 전용이라 검색엔진에 올리지 않는다.
export const metadata: Metadata = { title: "Your star report — SSOL Astro House", robots: { index: false, follow: false } };

export default async function ResultPageEn({ params }: PageProps<"/en/results/[id]/[page]">) {
  const { id, page } = await params;
  const n = Number(page);
  if (!Number.isInteger(n) || n < 1 || n > RESULT_PAGES) notFound();
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7" lang="en">
      <ResultViewEn id={id} page={n} />
      <AuthFooterLink lang="en" />
      <SiteFooterEn />
    </main>
  );
}
