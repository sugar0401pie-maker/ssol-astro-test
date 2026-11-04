// 영문판 쿠키 동의(owner 2026-11-04: 별도 배너 대신 테스트 시작 동의 화면의 선택 체크박스 + Cookie settings 페이지).
// 영문 화면(/en…)에서는 고른 사람만 구글 애널리틱스(분석)·X 픽셀(광고 측정)을 켠다 — 기본은 꺼짐(EU·UK 기준).
// 한국어 화면은 지금 동작 그대로(한국어 방침 기준). 브라우저의 Global Privacy Control 신호가 있으면 광고 측정은 늘 끈다.
// 동의 값은 쿠키 swh_cc(1년)에 둔다 — 나중에 결제 서버 전환(X Conversions API)도 같은 값을 읽을 수 있게.

export type CookieChoice = { analytics: boolean; ads: boolean };
export const CC_COOKIE = "swh_cc";
export const CC_MAX_AGE = 60 * 60 * 24 * 365;
export const CC_EVENT = "swh-cookie-consent";

export const isEnPath = (pathname: string) => pathname === "/en" || pathname.startsWith("/en/");

/** "a1d0" ↔ {analytics:true, ads:false}. 모르는 값이면 null(= 아직 안 고름 → 꺼짐) */
export function parseChoice(v: string | null | undefined): CookieChoice | null {
  const m = /^a([01])d([01])$/.exec(v ?? "");
  return m ? { analytics: m[1] === "1", ads: m[2] === "1" } : null;
}
export const serializeChoice = (c: CookieChoice) => `a${c.analytics ? 1 : 0}d${c.ads ? 1 : 0}`;

/** 이 화면에서 그 종류를 켜도 되는지(순수 규칙 — 테스트 있음) */
export function allowedOn(kind: "analytics" | "ads", pathname: string, choice: CookieChoice | null, gpc: boolean): boolean {
  if (!isEnPath(pathname)) return true;
  if (kind === "ads" && gpc) return false;
  return choice?.[kind] === true;
}

// ── 브라우저 전용 ──
export function readChoice(): CookieChoice | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${CC_COOKIE}=([^;]*)`));
  return parseChoice(m?.[1]);
}

export function saveChoice(c: CookieChoice): void {
  document.cookie = `${CC_COOKIE}=${serializeChoice(c)}; Max-Age=${CC_MAX_AGE}; Path=/; SameSite=Lax`;
  window.dispatchEvent(new Event(CC_EVENT));
}

export const gpcOn = () => typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

/** 지금 화면 주소 기준으로 켜도 되는지(브라우저에서 바로 판단) */
export function allowedNow(kind: "analytics" | "ads"): boolean {
  if (typeof window === "undefined") return false;
  return allowedOn(kind, window.location.pathname, readChoice(), gpcOn());
}
