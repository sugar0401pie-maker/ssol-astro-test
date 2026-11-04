"use client";

// 하단 언어 링크(owner 2026-11-04): 한국어 화면엔 'English', 영문 화면엔 '한국어'. 누르면 고른 언어를 쿠키에 1년 기억하고
// 같은 화면의 다른 언어판(없으면 그 언어 첫 화면)으로 간다. 영문판 스위치가 꺼져 있으면 아무것도 그리지 않는다.
import { usePathname } from "next/navigation";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, enSiteEnabled, switchTarget, type Lang } from "@/lib/i18n/lang";

export default function LangLink({ to }: { to: Lang }) {
  const pathname = usePathname() ?? "/";
  if (!enSiteEnabled()) return null;
  const href = switchTarget(pathname, to);
  return (
    <a
      href={href}
      lang={to}
      hrefLang={to}
      className="underline"
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${to}; Max-Age=${LANG_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
      }}
    >
      {to === "en" ? "English" : "한국어"}
    </a>
  );
}
