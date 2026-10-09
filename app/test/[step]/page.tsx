import type { Metadata } from "next";
import TestClient from "../TestClient";

// 테스트 화면마다 주소(owner 2026-10-09: 뒤로 가기가 되도록). 화면 그리기·이어 가기는 TestFlow가 주소를 읽어 정한다.
export const metadata: Metadata = { title: "쏠 아스트로 하우스 — 테스트" };

const STEPS = ["experience", "intro", "birth", "q1", "q2", "q3", "type", "type-check", "result"];
export const dynamicParams = false;
export function generateStaticParams() {
  return STEPS.map((step) => ({ step }));
}

export default function TestStepPage() {
  return <TestClient />;
}
