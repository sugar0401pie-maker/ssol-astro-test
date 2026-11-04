import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
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
  aboutJsonLd,
} from "@/lib/about/content";

// 공개 상세 소개 페이지(owner 2026-11-04, 검색엔진용). 로그인·로딩·이동 없이 서버가 그린 정적 HTML로 누구나 바로 연다.
// 내용은 lib/about/content.ts(owner 문서 그대로, ⚠️·⏸ 문항 제외). 홈과 같은 테마(크림 상자 + 남색 글자).
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: ABOUT_TITLE },
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: ABOUT_URL },
  openGraph: { type: "website", locale: "ko_KR", url: ABOUT_URL, title: ABOUT_TITLE, description: ABOUT_DESCRIPTION },
};

function TestButton() {
  return (
    <Link href="/test" prefetch={false} className="btn block">
      테스트 보러 가기
    </Link>
  );
}

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-[17px] font-semibold text-navy first:mt-0">{children}</h2>;

export default function AboutPage() {
  const groups = Array.from(new Set(FAQS.map((f) => f.group)));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd()).replace(/</g, "\\u003c") }} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
        <Link href="/" className="text-[13px] text-cream/70">
          ← 처음으로
        </Link>
        <h1 className="mt-3 text-[24px] font-bold leading-snug text-cream">{ABOUT_H1}</h1>
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

          <H2>자주 묻는 질문</H2>
          {groups.map((g) => (
            <section key={g} className="mt-4">
              <p className="text-[13px] font-semibold text-navy/70">{g}</p>
              {FAQS.filter((f) => f.group === g).map((f) => (
                <div key={f.q} className="mt-3">
                  <h3 className="text-[15px] font-semibold text-navy">Q. {f.q}</h3>
                  <p className="mt-1">A. {f.a}</p>
                </div>
              ))}
            </section>
          ))}
          {/* ⏸ 개정 약관(2026-11-25 시행) 확정 후 약관 문구와 똑같이 넣을 문항:
              - Q. 생년월일과 출생지는 어떻게 쓰이나요?
              - Q. 환불이 되나요? (이용약관 결제·환불 조항과 똑같이) */}
        </div>

        <div className="mt-8">
          <TestButton />
        </div>
      </main>
      <div className="intro-foot">
        <SiteFooter />
      </div>
    </>
  );
}
