import type { Metadata } from "next";
import Link from "next/link";
import AboutShell, { H2 } from "@/components/about/AboutShell";
import { ASTRO_DB } from "@/lib/report/dbData";
import { SIGNS_DESCRIPTION, SIGNS_H1, SIGNS_TITLE, SIGNS_URL, SIGN_DATES_NOTE, buildSignPages, signsIndexJsonLd } from "@/lib/about/signs";
import { ASTROLOGY_STANCE } from "@/lib/about/content";

// 12별자리 목록(owner 2026-11-15). 글은 해석 DB A1 그대로, 빌드 때 정적 HTML.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: SIGNS_TITLE },
  description: SIGNS_DESCRIPTION,
  alternates: { canonical: SIGNS_URL },
  openGraph: { type: "website", locale: "ko_KR", url: SIGNS_URL, title: SIGNS_TITLE, description: SIGNS_DESCRIPTION },
};

export default function SignsIndexPage() {
  const pages = buildSignPages(ASTRO_DB);
  return (
    <AboutShell current="/about/signs" jsonLd={signsIndexJsonLd(pages)}>
      <h1 className="mt-4 text-[24px] font-bold leading-snug text-cream">{SIGNS_H1}</h1>
      <p className="mt-3 text-[15px] leading-7 text-cream/85">{SIGNS_DESCRIPTION}</p>
      <ul className="mt-6 grid grid-cols-2 gap-3">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link href={`/about/signs/${p.slug}`} prefetch={false} className="block overflow-hidden rounded-2xl bg-cream text-navy">
              {/* eslint-disable-next-line @next/next/no-img-element -- 정적 그림(1080×1080) */}
              <img src={p.art} alt={`${p.name} 별자리 친구`} width={1080} height={1080} loading="lazy" className="block aspect-square w-full object-cover" />
              <div className="px-3 py-3">
                <p className="text-[16px] font-semibold">
                  <span aria-hidden="true">{p.symbol} </span>
                  {p.name}
                </p>
                <p className="mt-0.5 text-[12px] text-navy/60">
                  {p.dates} · {p.element}
                </p>
                <p className="mt-1.5 text-[13px] leading-5 text-navy/85">{p.keywords}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 rounded-2xl bg-cream px-5 py-6 text-[14px] leading-6 text-navy/85">
        <H2>한 줄로 보는 12별자리</H2>
        <table className="mt-3 w-full text-left text-[14px]">
          <thead>
            <tr className="text-[13px] text-navy/70">
              <th scope="col" className="py-2 pr-3 font-medium">별자리</th>
              <th scope="col" className="py-2 font-medium">한 줄 소개</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.slug} className="border-t border-navy/10 align-top">
                <th scope="row" className="py-2 pr-3 whitespace-nowrap font-medium text-navy">
                  <Link href={`/about/signs/${p.slug}`} prefetch={false} className="underline underline-offset-2">
                    {p.name}
                  </Link>
                </th>
                <td className="py-2">{p.oneLiner}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[13px] text-navy/70">{SIGN_DATES_NOTE}</p>
        <H2>별자리를 어떻게 다루나요</H2>
        <p className="mt-3">{ASTROLOGY_STANCE}</p>
      </div>
    </AboutShell>
  );
}
