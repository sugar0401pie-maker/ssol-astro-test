import type { Metadata } from "next";
import LegalDocEn from "@/components/legal/LegalDocEn";
import type { LegalBlock } from "@/lib/legal/en/blocks";
import { enSiteEnabled } from "@/lib/i18n/lang";
import doc from "@/lib/legal/en/privacy.json";

// 영문 개인정보처리방침((나) 영문 전용 별도 페이지, owner 2026-11-04 Word 원본 docs/legal_en/Privacy_Policy_2026-11-04.docx).
// 한국어 /legal과 따로 관리 — 한국어 방침을 고쳐도 이 페이지는 따라 바뀌지 않는다.
export const metadata: Metadata = {
  title: "Privacy Policy — SSOL Astro House",
  alternates: { canonical: "/en/legal/privacy" },
  robots: enSiteEnabled() ? undefined : { index: false, follow: false },
};

export default function PrivacyEn() {
  return <LegalDocEn blocks={doc as LegalBlock[]} current="privacy" />;
}
