import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AboutShell, { H2 } from "@/components/about/AboutShell";
import { ASTRO_DB } from "@/lib/report/dbData";
import { SIGN_DATES_NOTE, buildSignPages, signDescription, signJsonLd, signTitle, signUrl } from "@/lib/about/signs";
import { ASTROLOGY_STANCE } from "@/lib/about/content";

// 별자리 한 개 페이지(owner 2026-11-15). 글은 해석 DB A1(소개)·A2(태양)·A3(달)·A4(상승궁) 그대로, 빌드 때 정적 HTML.
export const dynamic = "force-static";
export const dynamicParams = false;

const all = () => buildSignPages(ASTRO_DB);

export function generateStaticParams() {
  return all().map((p) => ({ sign: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ sign: string }> }): Promise<Metadata> {
  const { sign } = await params;
  const p = all().find((x) => x.slug === sign);
  if (!p) return {};
  const url = signUrl(p.slug);
  const title = signTitle(p);
  const description = signDescription(p);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "ko_KR", url, title, description, images: [{ url: p.art, width: 1080, height: 1080 }] },
  };
}

export default async function SignPage({ params }: { params: Promise<{ sign: string }> }) {
  const { sign } = await params;
  const pages = all();
  const i = pages.findIndex((x) => x.slug === sign);
  if (i < 0) notFound();
  const p = pages[i];
  const prev = pages[(i + pages.length - 1) % pages.length];
  const next = pages[(i + 1) % pages.length];
  const facts: [string, string][] = [
    ["기간(대략)", p.dates],
    ["원소", p.element],
    ["성질", p.modality],
    ["수호성", p.ruler],
    ["키워드", p.keywords],
  ];
  return (
    <AboutShell current="/about/signs" jsonLd={signJsonLd(p)}>
      <h1 className="mt-4 text-[24px] font-bold leading-snug text-cream">
        <span aria-hidden="true">{p.symbol} </span>
        {p.name} — {p.keywords}
      </h1>
      <p className="mt-3 text-[15px] leading-7 text-cream/85">{p.oneLiner}</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 그림(1080×1080) */}
      <img src={p.art} alt={`${p.name} 별자리 친구`} width={1080} height={1080} className="mt-5 block aspect-square w-full rounded-2xl object-cover" />
      <div className="mt-6 rounded-2xl bg-cream px-5 py-6 text-[14px] leading-6 text-navy/85">
        <H2>{p.name} 한눈에 보기</H2>
        <table className="mt-3 w-full text-left text-[14px]">
          <tbody>
            {facts.map(([k, v]) => (
              <tr key={k} className="border-t border-navy/10 first:border-t-0">
                <th scope="row" className="w-28 py-2 pr-3 font-medium text-navy">{k}</th>
                <td className="py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[12px] text-navy/60">{SIGN_DATES_NOTE}</p>

        <H2>{p.name}는 이런 별자리예요</H2>
        <p className="mt-3">{p.intro}</p>

        <H2>태양이 {p.name}에 있을 때</H2>
        <p className="mt-3 font-medium text-navy">{p.sun.line}</p>
        <p className="mt-2">{p.sun.text}</p>
        <p className="mt-2">
          <span className="font-medium text-navy">지나칠 때 </span>
          {p.sun.shadow}
        </p>

        <H2>달이 {p.name}에 있을 때</H2>
        <p className="mt-3 font-medium text-navy">{p.moon.line}</p>
        <p className="mt-2">{p.moon.text}</p>
        <p className="mt-2">
          <span className="font-medium text-navy">마음이 지칠 때 </span>
          {p.moon.comfort}
        </p>

        <H2>상승궁이 {p.name}일 때</H2>
        <p className="mt-3 font-medium text-navy">{p.rising.line}</p>
        <p className="mt-2">{p.rising.text}</p>
        <p className="mt-2 text-[13px] text-navy/70">상승궁은 태어난 시간을 알아야 정할 수 있어요.</p>

        <H2>별자리를 어떻게 다루나요</H2>
        <p className="mt-3">{ASTROLOGY_STANCE}</p>
        <p className="mt-3">
          태양 하나만으로 사람을 다 설명할 수는 없어요. 테스트에서는 태양·달·상승궁을 포함해 천체 10개의 자리를 함께 계산해 나만의 출생차트를 그려요.
        </p>
      </div>
      <nav aria-label="다른 별자리" className="mt-6 flex justify-between gap-3 text-[14px]">
        <Link href={`/about/signs/${prev.slug}`} prefetch={false} className="text-cream/80 underline underline-offset-2">
          ‹ {prev.name}
        </Link>
        <Link href="/about/signs" prefetch={false} className="text-cream/80 underline underline-offset-2">
          12별자리 모두 보기
        </Link>
        <Link href={`/about/signs/${next.slug}`} prefetch={false} className="text-cream/80 underline underline-offset-2">
          {next.name} ›
        </Link>
      </nav>
    </AboutShell>
  );
}
