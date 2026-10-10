import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import ResultView from "@/components/results/ResultView";
import { RESULT_PAGES } from "@/lib/results/lastPage";

export const metadata: Metadata = { title: "쏠 아스트로 하우스 — 결과" };

// 결과 페이지별 주소(패키지 v3: /result/{id}/1~7 — 이 사이트는 기존 /results/{id} 아래에 둔다)
export default async function ResultPagePage({ params }: PageProps<"/results/[id]/[page]">) {
  const { id, page } = await params;
  const n = Number(page);
  if (!Number.isInteger(n) || n < 1 || n > RESULT_PAGES) notFound();
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7">
      <ResultView id={id} page={n} />
      <AuthFooterLink />
      <SiteFooter />
    </main>
  );
}
