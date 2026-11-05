import type { Metadata } from "next";
import Link from "next/link";
import AboutShell, { H2, TestButton } from "@/components/about/AboutShell";
import FaqList from "@/components/about/FaqList";
import { participantsDate, PARTICIPANTS } from "@/lib/about/participants";
import {
  ABOUT_DESCRIPTION,
  ABOUT_H1,
  ABOUT_INTRO,
  ABOUT_TITLE,
  ABOUT_URL,
  ASTROLOGY_STANCE,
  AT_A_GLANCE,
  FAQS,
  MAKERS,
  STEPS,
  SUB_PAGES,
  aboutJsonLd,
} from "@/lib/about/content";

// 공개 상세 소개 페이지(owner 2026-11-04, v2.1 2026-11-05). 로그인·로딩·이동 없이 서버가 그린 정적 HTML.
// 내용은 lib/about/content.ts 한 곳. 주제별 자세한 내용은 /about/<주제> 하위 페이지.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: ABOUT_TITLE },
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: ABOUT_URL },
  openGraph: { type: "website", locale: "ko_KR", url: ABOUT_URL, title: ABOUT_TITLE, description: ABOUT_DESCRIPTION },
};

export default function AboutPage() {
  return (
    <AboutShell current="/about" jsonLd={aboutJsonLd()}>
      <h1 className="mt-4 text-[24px] font-bold leading-snug text-cream">{ABOUT_H1}</h1>
      <p className="mt-3 text-[15px] leading-7 text-cream/85">{ABOUT_INTRO}</p>
      <p className="mt-3 text-[14px] text-cream/75">
        지금까지 {PARTICIPANTS.count.toLocaleString("ko-KR")}명이 참여했어요 ({participantsDate()} 기준 주간 집계)
      </p>
      <div className="mt-5">
        <TestButton />
      </div>

      <div className="mt-8 rounded-2xl bg-cream px-5 py-6 text-[14px] leading-6 text-navy/85">
        <H2>한눈에 보기</H2>
        <table className="mt-3 w-full text-left text-[14px]">
          <tbody>
            {AT_A_GLANCE.map(([k, v]) => (
              <tr key={k} className="border-t border-navy/10 align-top first:border-t-0">
                <th scope="row" className="w-1/3 py-2 pr-3 font-medium text-navy">{k}</th>
                <td className="py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <H2>이용 순서</H2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5">
          {STEPS.map(([pre, bold, post], i) => (
            <li key={i}>
              {pre}
              <strong className="font-semibold text-navy">{bold}</strong>
              {post}
            </li>
          ))}
        </ol>

        <H2>점성술을 어떻게 다루나요</H2>
        <p className="mt-3">{ASTROLOGY_STANCE}</p>

        <H2>만든 사람</H2>
        <p className="mt-3">{MAKERS}</p>

        <FaqList faqs={FAQS} />

        <H2>더 자세히 보기</H2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          {SUB_PAGES.map((p) => (
            <li key={p.slug}>
              <Link href={`/about/${p.slug}`} prefetch={false} className="font-medium text-navy underline underline-offset-2">
                {p.nav}
              </Link>{" "}
              — {p.description}
            </li>
          ))}
        </ul>
      </div>
    </AboutShell>
  );
}
