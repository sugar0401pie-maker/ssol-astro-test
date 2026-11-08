// 해외 접속자 영문 사이트 안내 규칙(owner 2026-11-08). 순수 함수 — proxy.ts·화면·테스트가 같은 규칙을 쓴다.
// 영문 사이트는 별도 프로젝트(ssol-astro-en, EN_SITE). 이 한국어 사이트는:
// - 접속 지역(Vercel x-vercel-ip-country)이 한국이 아니면 어느 화면으로 들어와도 영문 사이트 첫 화면으로 보낸다(매번).
// - 예외 ① 검색 로봇·미리보기 수집기(보내면 한국어 사이트가 검색에서 빠짐) ② 영문 사이트 하단 '한국어'(?lang=ko)로
//   돌아온 사람 — 쿠키(swh_lang=ko, 1년)로 기억해 다시 보내지 않는다. 지역을 모르면 보내지 않는다.
// - API·그림 파일·결제 복귀 화면(/checkout/…)은 건드리지 않는다(결제 중 끊기지 않게).
// - 예전 영문 주소(/en/…)는 영문 사이트의 같은 화면으로(/en/start → EN_SITE/start).
// 스위치 NEXT_PUBLIC_EN_SITE_LIVE=1(영문 사이트가 배포된 뒤 켠다)이 꺼져 있으면 아무도 보내지 않고, /en 화면은 예전처럼 숨김(정책만 열림).
import { EN_SITE } from "../site.ts";

export type Lang = "ko" | "en";

export const LANG_COOKIE = "swh_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * 영문 사이트 연결 스위치. process.env.NEXT_PUBLIC_EN_SITE_LIVE는 이 모양 그대로 읽어야 빌드 때 값이 박힌다(브라우저·proxy 모두).
 * 예전 스위치(NEXT_PUBLIC_EN_SITE)와 이름을 일부러 다르게 했다 — 예전 값이 남아 있어도 영문 사이트 배포 전에 켜지지 않게.
 */
export function enSiteEnabled(value: string | undefined = process.env.NEXT_PUBLIC_EN_SITE_LIVE): boolean {
  return value === "1";
}

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|preview|yeti|daum|kakaotalk-scrap|whatsapp|telegram|discord|linkedin|pinterest|lighthouse|headless/i;

/** 검색 로봇·미리보기 수집기인지(User-Agent). 비어 있으면 로봇으로 본다(보내지 않는 쪽 = 안전). */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT_RE.test(userAgent);
}

const isEnPath = (p: string) => p === "/en" || p.startsWith("/en/");

/** 해외 접속이어도 보내지 않는 경로(앞부분 일치) — 결제 복귀·검색엔진용 파일 */
const STAY_PREFIXES = ["/checkout/", "/robots.txt", "/sitemap.xml", "/llms.txt"];

export type KoRoute =
  | { kind: "pass" }
  | { kind: "remember-ko" } // ?lang=ko — 쿠키를 심고 같은 화면(lang 빼고)으로
  | { kind: "redirect"; to: string }; // 다른 곳(영문 사이트 또는 한국어 첫 화면)으로 307

/**
 * 한국어 사이트 요청 하나를 어떻게 할지. search는 '?…' 포함 문자열(없으면 "").
 * 해외 접속자를 보낼 때는 광고 추적(utm 등)이 끊기지 않게 쿼리를 그대로 붙인다.
 */
export function koRoute(input: {
  pathname: string;
  search: string;
  country: string | null | undefined;
  cookieLang: string | null | undefined;
  userAgent: string | null | undefined;
  enabled: boolean;
}): KoRoute {
  const { pathname, search, enabled } = input;
  const params = new URLSearchParams(search);
  if (params.get("lang") === "ko") return { kind: "remember-ko" };

  if (isEnPath(pathname)) {
    if (enabled) return { kind: "redirect", to: `${EN_SITE}${pathname.slice(3) || "/"}${search}` };
    // 영문 사이트 연결 전: 예전처럼 영문 화면은 숨기고(한국어 첫 화면), 영문 정책 페이지만 연다
    if (pathname === "/en/legal" || pathname.startsWith("/en/legal/")) return { kind: "pass" };
    return { kind: "redirect", to: "/" };
  }

  if (!enabled) return { kind: "pass" };
  if (STAY_PREFIXES.some((p) => pathname.startsWith(p))) return { kind: "pass" };
  if (isBot(input.userAgent)) return { kind: "pass" };
  if (input.cookieLang === "ko") return { kind: "pass" };
  const c = (input.country ?? "").trim().toUpperCase();
  if (!c || c === "KR") return { kind: "pass" };
  return { kind: "redirect", to: `${EN_SITE}/${search}` };
}

/** ?lang=ko를 뺀 쿼리 */
export function withoutLangParam(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("lang");
  const s = params.toString();
  return s ? `?${s}` : "";
}
