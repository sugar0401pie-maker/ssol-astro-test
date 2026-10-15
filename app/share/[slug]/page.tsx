import type { Metadata } from "next";
import Intro from "@/components/intro/Intro";

// 공유 링크로 들어온 첫 화면(owner 2026-10-15). 화면은 사이트 첫 화면과 같고, 주소의 공유 코드(ref)·utm은
// AttributionCapture가 유입 경로로 기록한다. 없는 코드여도 첫 화면을 그대로 보여 준다(링크가 깨진 것처럼 보이지 않게).
export const metadata: Metadata = { title: "쏠 아스트로 하우스", robots: { index: false, follow: true } };

export default function SharedHome() {
  return <Intro />;
}
