import type { Metadata } from "next";
import BirthStartEn from "@/components/en/BirthStartEn";

// 영문 출생 정보 입력((나) 영문 전용, owner 2026-11-04). 테스트 중간 화면이라 검색엔진에 올리지 않는다.
export const metadata: Metadata = { title: "Your birth details — SSOL Astro House", robots: { index: false, follow: false } };

export default function StartBirthEn() {
  return <BirthStartEn />;
}
