// 영문판(/en) 언어 안내 규칙(owner 2026-11-04). 순수 함수 — proxy.ts와 화면이 같은 규칙을 쓴다.
// - 접속 지역(Vercel x-vercel-ip-country)이 한국이 아니면 첫 화면("/")에서 영문 첫 화면("/en")으로 보낸다.
// - 사용자가 하단 링크로 언어를 고르면 쿠키(swh_lang, 1년)로 기억하고, 그다음부터는 지역과 상관없이 그 언어를 따른다.
// - 검색 로봇에는 적용하지 않는다(구글 로봇은 주로 미국에서 접속 — 보내 버리면 한국어 첫 화면이 검색에서 빠질 수 있음).
// - 첫 화면만 보낸다. 결과·결제·테스트 중간 화면은 사용자가 연 주소 그대로 둔다(본인 결과 링크·결제 복귀가 끊기지 않게).
// 영문 화면이 다 만들어지기 전까지는 EN_SITE 스위치(NEXT_PUBLIC_EN_SITE=1)가 꺼져 있어 아무도 보내지 않고 하단 링크도 숨긴다.

export type Lang = "ko" | "en";

export const LANG_COOKIE = "swh_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** 영문판 공개 스위치. 영문 테스트 흐름이 다 갖춰진 뒤 Vercel에 NEXT_PUBLIC_EN_SITE=1을 넣어 켠다. */
// process.env.NEXT_PUBLIC_EN_SITE는 반드시 이 모양 그대로 써야 빌드 때 값이 박힌다(브라우저·proxy 모두).
// env 객체를 넘겨 env.X로 읽으면 빌드가 값을 넣지 못해 브라우저에서는 늘 꺼진 것으로 보인다(2026-11-04 확인).
export function enSiteEnabled(value: string | undefined = process.env.NEXT_PUBLIC_EN_SITE, hidden: boolean = EN_PAGES_HIDDEN): boolean {
  return !hidden && value === "1";
}

/**
 * 영문 페이지 숨김(owner 2026-11-04: 토스 해외결제 심사가 끝날 때까지 영문판을 숨기고, 어디서 열든 한국어 페이지로).
 * true면 스위치(NEXT_PUBLIC_EN_SITE)와 상관없이 /en으로 시작하는 모든 화면을 한국어 첫 화면("/")으로 보내고,
 * 첫 화면의 지역별 영문 안내·하단 English 링크도 끈다. 다시 열 때는 false로 바꿔 배포한다(코드 상수라 환경변수 실수로 열리지 않음).
 */
export const EN_PAGES_HIDDEN = true;

/** 숨김일 때 /en·/en/… 화면을 어디로 보낼지(아니면 null) — API(/api/en/…)는 화면이 아니라 해당 없음 */
export function hiddenEnRedirect(pathname: string, hidden: boolean = EN_PAGES_HIDDEN): string | null {
  // 영문 정책 페이지(/en/legal/…)는 숨김 중에도 열린다(owner 2026-11-05: 검토용) — 검색 제외(noindex)는 그대로
  if (pathname === "/en/legal" || pathname.startsWith("/en/legal/")) return null;
  return hidden && (pathname === "/en" || pathname.startsWith("/en/")) ? "/" : null;
}

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|preview|yeti|daum|kakaotalk-scrap|whatsapp|telegram|discord|linkedin|pinterest|lighthouse|headless/i;

/** 검색 로봇·미리보기 수집기인지(User-Agent). 비어 있으면 로봇으로 본다(보내지 않는 쪽 = 안전). */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT_RE.test(userAgent);
}

export function parseLang(v: string | null | undefined): Lang | null {
  return v === "ko" || v === "en" ? v : null;
}

/**
 * 첫 화면("/")에서 다른 언어 첫 화면으로 보낼지. 보낼 곳 또는 null(그대로).
 * 고른 언어(쿠키)가 지역보다 우선. 쿠키가 없을 때만 지역을 본다. 지역을 모르면 그대로.
 */
export function rootRedirect(input: {
  pathname: string;
  country: string | null | undefined;
  cookieLang: string | null | undefined;
  userAgent: string | null | undefined;
  enabled: boolean;
}): string | null {
  if (!input.enabled || input.pathname !== "/") return null;
  if (isBot(input.userAgent)) return null;
  const chosen = parseLang(input.cookieLang);
  if (chosen) return chosen === "en" ? "/en" : null;
  const c = (input.country ?? "").trim().toUpperCase();
  if (!c) return null;
  return c === "KR" ? null : "/en";
}

/** 영문판에 같은 화면이 있는 경로(언어 링크가 같은 화면으로 가도록). 영문 화면이 생길 때마다 더한다. */
export const EN_MIRRORED_PATHS = ["/"] as const;

/** 하단 언어 링크가 갈 곳. 같은 화면의 다른 언어판이 있으면 그리로, 없으면 그 언어 첫 화면으로. */
export function switchTarget(pathname: string, to: Lang): string {
  const isEn = pathname === "/en" || pathname.startsWith("/en/");
  const base = isEn ? pathname.slice(3) || "/" : pathname;
  const mirrored = (EN_MIRRORED_PATHS as readonly string[]).includes(base);
  if (to === "en") return mirrored ? (base === "/" ? "/en" : `/en${base}`) : "/en";
  return mirrored ? base : "/";
}
