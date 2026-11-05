import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AboutShell, { H2 } from "@/components/about/AboutShell";
import FaqList from "@/components/about/FaqList";
import {
  ASTROLOGY_STANCE,
  MAKERS,
  REPORT_CHAPTERS,
  STEPS,
  SUB_PAGES,
  faqsOf,
  subPageJsonLd,
  subPageUrl,
} from "@/lib/about/content";

// 주제별 공개 소개 페이지(owner 2026-11-05: AI·검색 수집이 잘 되도록 주제마다 주소를 따로).
// 목록은 lib/about/content.ts SUB_PAGES — 빌드 때 정적 HTML로 만들고, 목록에 없는 주소는 404.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return SUB_PAGES.map((p) => ({ slug: p.slug }));
}

const find = (slug: string) => SUB_PAGES.find((p) => p.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = find((await params).slug);
  if (!p) return {};
  const url = subPageUrl(p.slug);
  return {
    title: { absolute: p.title },
    description: p.description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "ko_KR", url, title: p.title, description: p.description },
  };
}

function Body({ slug }: { slug: string }) {
  if (slug === "how-it-works")
    return (
      <>
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
      </>
    );
  if (slug === "report")
    return (
      <>
        <H2>별 리포트 7장</H2>
        <table className="mt-3 w-full text-left text-[14px]">
          <thead>
            <tr className="text-[13px] text-navy/70">
              <th scope="col" className="py-2 pr-3 font-medium">장</th>
              <th scope="col" className="py-2 pr-3 font-medium">담긴 내용</th>
              <th scope="col" className="py-2 font-medium">이용</th>
            </tr>
          </thead>
          <tbody>
            {REPORT_CHAPTERS.map((c) => (
              <tr key={c.n} className="border-t border-navy/10 align-top">
                <th scope="row" className="py-2 pr-3 font-medium text-navy">
                  {c.n}. {c.title}
                </th>
                <td className="py-2 pr-3">{c.what}</td>
                <td className="py-2 whitespace-nowrap">{c.free ? "무료" : "유료"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3">1~3장은 무료이고, 4~7장은 1,900원을 결제하면 열려요. 7장의 질문은 쏘웰라에서 대화로 이어 갈 수 있어요.</p>
      </>
    );
  if (slug === "trust")
    return (
      <>
        <H2>점성술을 어떻게 다루나요</H2>
        <p className="mt-3">{ASTROLOGY_STANCE}</p>
        <H2>만든 사람</H2>
        <p className="mt-3">{MAKERS}</p>
      </>
    );
  return (
    <>
      <H2>자세한 내용</H2>
      <p className="mt-3">
        정확한 기준은{" "}
        <a href="/legal#privacy" className="font-medium text-navy underline underline-offset-2">
          개인정보처리방침
        </a>
        과{" "}
        <a href="/legal#terms" className="font-medium text-navy underline underline-offset-2">
          이용약관
        </a>
        에서 확인할 수 있어요.
      </p>
    </>
  );
}

export default async function AboutSubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = find(slug);
  if (!p) notFound();
  return (
    <AboutShell current={`/about/${p.slug}`} jsonLd={subPageJsonLd(p)}>
      <h1 className="mt-4 text-[24px] font-bold leading-snug text-cream">{p.h1}</h1>
      <p className="mt-3 text-[15px] leading-7 text-cream/85">{p.description}</p>
      <div className="mt-8 rounded-2xl bg-cream px-5 py-6 text-[14px] leading-6 text-navy/85">
        <Body slug={p.slug} />
        <FaqList faqs={faqsOf(p.groups)} />
      </div>
    </AboutShell>
  );
}
