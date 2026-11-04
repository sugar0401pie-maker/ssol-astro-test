import type { Metadata } from "next";
import IntroEn from "@/components/intro/IntroEn";
import { enSiteEnabled } from "@/lib/i18n/lang";

// 영문 첫 화면(owner 2026-11-04). 영문판 스위치(NEXT_PUBLIC_EN_SITE=1)를 켜기 전까지는 검색엔진에 올리지 않는다
// (영문 테스트·결과 화면이 아직 없어서). 켜면 한국어 첫 화면과 짝(hreflang)으로 알린다.
export const metadata: Metadata = {
  title: "SSOL Astro House | Your birth chart star report",
  description:
    "Map your birth chart from your birth date and place, discover your sign, elements and type, and look back on 2026 with SSOL Wellness House. A tool for self-reflection, not prediction.",
  alternates: { canonical: "/en", languages: { ko: "/", en: "/en", "x-default": "/" } },
  openGraph: { locale: "en_US", url: "/en", title: "SSOL Astro House", siteName: "SSOL Astro House" },
  robots: enSiteEnabled() ? undefined : { index: false, follow: false },
};

export default function HomeEn() {
  return <IntroEn />;
}
