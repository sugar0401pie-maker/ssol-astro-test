import type { Metadata } from "next";
import { WelcomeEn } from "@/components/en/StartStepsEn";

// 영문 테스트 단계(주소가 화면마다 따로). 테스트 중간 화면이라 검색엔진에 올리지 않는다.
export const metadata: Metadata = { title: "Welcome — SSOL Astro House", robots: { index: false, follow: false } };

export default function Page() {
  return <WelcomeEn />;
}
