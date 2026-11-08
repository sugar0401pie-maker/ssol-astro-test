// 하단 언어 링크: 한국어 화면엔 'English'(영문 사이트, 별도 프로젝트), 예전 /en 화면엔 '한국어'.
// 영문 사이트 연결 스위치(NEXT_PUBLIC_EN_SITE_LIVE)가 꺼져 있으면 아무것도 그리지 않는다.
import { enSiteEnabled, type Lang } from "@/lib/i18n/lang";
import { EN_SITE } from "@/lib/site";

export default function LangLink({ to }: { to: Lang }) {
  if (!enSiteEnabled()) return null;
  return (
    <a href={to === "en" ? `${EN_SITE}/` : "/?lang=ko"} lang={to} hrefLang={to} className="underline">
      {to === "en" ? "English" : "한국어"}
    </a>
  );
}
