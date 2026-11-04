import type { Metadata } from "next";
import Link from "next/link";
import CookieSettingsEn from "@/components/en/CookieSettingsEn";
import SiteFooterEn from "@/components/SiteFooterEn";
import { enSiteEnabled } from "@/lib/i18n/lang";

export const metadata: Metadata = {
  title: "Cookie settings — SSOL Astro House",
  alternates: { canonical: "/en/cookie-settings" },
  robots: enSiteEnabled() ? { index: false, follow: true } : { index: false, follow: false },
};

export default function Page() {
  return (
    <div lang="en" className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Link href="/en" className="text-[13px] text-cream/70">
          ← Home
        </Link>
        <div className="mt-3">
          <CookieSettingsEn mode="settings" />
        </div>
      </main>
      <SiteFooterEn />
    </div>
  );
}
