import type { Metadata } from "next";
import QuestionsEn from "@/components/en/QuestionsEn";

// 영문 질문 3개(영문판 2026-11-04). 테스트 중간 화면이라 검색엔진에 올리지 않는다.
export const metadata: Metadata = { title: "Three questions — SSOL Astro House", robots: { index: false, follow: false } };

export default function QuestionsEnPage() {
  return <QuestionsEn />;
}
