// 첫 화면 언어 안내(owner 2026-11-04): 한국 밖에서 처음 온 사람은 영문 첫 화면으로. 규칙은 lib/i18n/lang.ts.
// 첫 화면("/")에만 돈다 — 다른 화면·API·그림 파일에는 영향이 없다. 스위치(NEXT_PUBLIC_EN_SITE=1)가 꺼져 있으면 아무 일도 하지 않는다.
import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, enSiteEnabled, hiddenEnRedirect, rootRedirect } from "@/lib/i18n/lang";

export function proxy(request: NextRequest) {
  // 영문 페이지 숨김 중이면 /en… 화면은 한국어 첫 화면으로(owner 2026-11-04)
  const hidden = hiddenEnRedirect(request.nextUrl.pathname);
  if (hidden) {
    const url = request.nextUrl.clone();
    url.pathname = hidden;
    url.search = "";
    return NextResponse.redirect(url, 307);
  }
  const to = rootRedirect({
    pathname: request.nextUrl.pathname,
    country: request.headers.get("x-vercel-ip-country"),
    cookieLang: request.cookies.get(LANG_COOKIE)?.value,
    userAgent: request.headers.get("user-agent"),
    enabled: enSiteEnabled(),
  });
  if (!to) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = to;
  // 일시 이동(307): 같은 주소가 사람·지역마다 다른 곳으로 가므로 브라우저·CDN이 영구 기억하지 않게
  return NextResponse.redirect(url, 307);
}

export const config = { matcher: ["/", "/en", "/en/:path*"] };
