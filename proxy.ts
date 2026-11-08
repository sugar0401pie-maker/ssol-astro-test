// 해외 접속자를 영문 사이트(별도 프로젝트)로 보낸다(owner 2026-11-08). 규칙은 lib/i18n/lang.ts koRoute.
// 스위치(NEXT_PUBLIC_EN_SITE_LIVE=1)가 꺼져 있으면 예전 /en 화면 숨김만 한다.
import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, enSiteEnabled, koRoute, withoutLangParam } from "@/lib/i18n/lang";

export function proxy(request: NextRequest) {
  const r = koRoute({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    country: request.headers.get("x-vercel-ip-country"),
    cookieLang: request.cookies.get(LANG_COOKIE)?.value,
    userAgent: request.headers.get("user-agent"),
    enabled: enSiteEnabled(),
  });
  if (r.kind === "pass") return NextResponse.next();
  if (r.kind === "remember-ko") {
    // 영문 사이트 하단 '한국어'로 왔다 — 기억하고 주소에서 lang만 뺀다
    const url = request.nextUrl.clone();
    url.search = withoutLangParam(request.nextUrl.search);
    const res = NextResponse.redirect(url, 307);
    res.cookies.set(LANG_COOKIE, "ko", { maxAge: LANG_COOKIE_MAX_AGE, path: "/", sameSite: "lax" });
    return res;
  }
  // 일시 이동(307): 같은 주소가 사람·지역마다 다른 곳으로 가므로 브라우저·CDN이 영구 기억하지 않게
  const to = r.to.startsWith("http") ? r.to : new URL(r.to, request.url);
  return NextResponse.redirect(to, 307);
}

// API·Next 내부 파일·점이 들어간 파일(그림·txt 등)은 건드리지 않는다
export const config = { matcher: ["/((?!api/|_next/|.*\\..*).*)"] };
