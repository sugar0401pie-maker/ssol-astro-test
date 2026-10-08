import type { Metadata } from "next";
import TestClient from "./TestClient";

export const metadata: Metadata = { title: "쏠 점성술 하우스 — 테스트" };

export default function TestPage() {
  return <TestClient />;
}
