import type { Metadata } from "next";
import TestFlow from "@/components/test/TestFlow";

export const metadata: Metadata = { title: "쏠 점성술 하우스 — 테스트" };

export default function TestPage() {
  return <TestFlow />;
}
