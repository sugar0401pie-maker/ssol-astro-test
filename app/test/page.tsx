import type { Metadata } from "next";
import TestClient from "./TestClient";

export const metadata: Metadata = { title: "쏠 아스트로 하우스 — 테스트" };

export default function TestPage() {
  return <TestClient />;
}
