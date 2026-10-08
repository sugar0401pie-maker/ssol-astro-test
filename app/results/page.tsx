import type { Metadata } from "next";
import ResultsList from "@/components/results/ResultsList";

export const metadata: Metadata = { title: "쏠 점성술 하우스 — 내 결과" };

export default function ResultsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <ResultsList />
    </main>
  );
}
