import { SEO_TITLE } from "@/lib/seo";
import type { Metadata } from "next";
import Intro from "@/components/intro/Intro";
import { enSiteEnabled } from "@/lib/i18n/lang";
import { EN_SITE } from "@/lib/site";

// 검색 결과에 보이는 첫 화면 제목(lib/seo.ts). 영문판을 켜면 영문 첫 화면과 짝(hreflang)으로 알린다.
export const metadata: Metadata = {
  title: SEO_TITLE,
  ...(enSiteEnabled() ? { alternates: { canonical: "/", languages: { ko: "/", en: `${EN_SITE}/`, "x-default": "/" } } } : {}),
};

export default function Home() {
  return <Intro />;
}
