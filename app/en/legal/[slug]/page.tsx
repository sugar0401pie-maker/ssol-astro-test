import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalDocEn from "@/components/legal/LegalDocEn";
import { EN_LEGAL_PAGES, type EnLegalSlug, type LegalBlock } from "@/lib/legal/en/blocks";
import { enSiteEnabled } from "@/lib/i18n/lang";
import privacy from "@/lib/legal/en/privacy.json";
import birth from "@/lib/legal/en/birth-details-consent.json";
import health from "@/lib/legal/en/consumer-health-data.json";
import cookies from "@/lib/legal/en/cookies.json";
import terms from "@/lib/legal/en/terms.json";
import disclaimer from "@/lib/legal/en/disclaimer.json";
import refund from "@/lib/legal/en/refund.json";

// 영문 정책 페이지 — 정책마다 따로 주소((나) 영문 전용 별도 페이지, owner 2026-11-04). 한국어 /legal과 따로 관리:
// 한국어 약관·방침을 고쳐도 이 페이지들은 따라 바뀌지 않는다.
const DOCS: Record<EnLegalSlug, unknown> = {
  privacy,
  "birth-details-consent": birth,
  "consumer-health-data": health,
  cookies,
  terms,
  disclaimer,
  refund,
};

export const dynamicParams = false;
export function generateStaticParams() {
  return EN_LEGAL_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/en/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = EN_LEGAL_PAGES.find((p) => p.slug === slug);
  return {
    title: `${page?.title ?? "Policies"} — SSOL Astro House`,
    alternates: { canonical: `/en/legal/${slug}` },
    robots: enSiteEnabled() ? undefined : { index: false, follow: false },
  };
}

export default async function EnLegalPage({ params }: PageProps<"/en/legal/[slug]">) {
  const { slug } = await params;
  const doc = DOCS[slug as EnLegalSlug];
  if (!doc) notFound();
  return <LegalDocEn blocks={doc as LegalBlock[]} current={slug} />;
}
