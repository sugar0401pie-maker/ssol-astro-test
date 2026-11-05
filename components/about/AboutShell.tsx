// 공개 소개 페이지(/about, /about/<주제>) 공통 틀 — 로그인·로딩·이동 없이 서버가 그리는 정적 HTML.
// 페이지마다 맨 아래에 [테스트 보러 가기](/test) + [쏘웰라와 이야기하기](쏘웰라 채팅) 버튼, 고지 한 줄, 사업자 정보 푸터.
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { ABOUT_DISCLAIMER, SOWELLA_URL, SUB_PAGES } from "@/lib/about/content";

export function TestButton() {
  return (
    <Link href="/test" prefetch={false} className="btn block">
      테스트 보러 가기
    </Link>
  );
}

export function SowellaLink() {
  return (
    <a href={SOWELLA_URL} className="btn block ghost">
      쏘웰라와 이야기하기
    </a>
  );
}

export const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-8 text-[17px] font-semibold text-navy first:mt-0">{children}</h2>
);

/** 소개 페이지 사이를 오가는 목록(현재 페이지는 굵게) */
function AboutNav({ current }: { current: string }) {
  const items = [{ href: "/about", label: "소개" }, ...SUB_PAGES.map((p) => ({ href: `/about/${p.slug}`, label: p.nav }))];
  return (
    <nav aria-label="소개 페이지" className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[13px]">
      {items.map((it) =>
        it.href === current ? (
          <span key={it.href} aria-current="page" className="font-semibold text-cream">
            {it.label}
          </span>
        ) : (
          <Link key={it.href} href={it.href} prefetch={false} className="text-cream/70 underline-offset-2 hover:underline">
            {it.label}
          </Link>
        ),
      )}
    </nav>
  );
}

export default function AboutShell({ current, jsonLd, children }: { current: string; jsonLd: object; children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
        <Link href="/" prefetch={false} className="text-[13px] text-cream/70">
          ← 처음으로
        </Link>
        <AboutNav current={current} />
        {children}
        <div className="mt-8 grid gap-3">
          <TestButton />
          <SowellaLink />
        </div>
        <p className="mt-6 text-[12px] leading-5 text-cream/60">{ABOUT_DISCLAIMER}</p>
      </main>
      {/* .intro-foot은 첫 화면에서만 보이게(proto.css) 되어 있어 쓰지 않는다 — 소개 페이지에서는 늘 보이게 */}
      <div className="border-t border-cream/10 px-4 pb-8 pt-5">
        <div className="mx-auto max-w-2xl">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
