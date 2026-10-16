// 유입 경로(어디서 들어왔는지) — owner 개발 메모 2026-10-15. 순수 함수: 브라우저(모으기)·서버(다시 거르기)가 같이 쓴다.
// 남기는 것: utm 값, 공유 링크 코드(ref), 들어오기 직전 사이트의 도메인만, 처음 연 페이지 경로(쿼리 없이), 앱 안 브라우저 종류, 처음 본 시각.
// 남기지 않는 것: 들어오기 직전 주소 전체·쿼리(검색어 등), IP, 출생 정보·이름 같은 입력값.

export interface Touch {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  /** 공유 링크 코드(astro_share_links.slug) */
  ref?: string;
  /** 들어오기 직전 사이트의 도메인만(예: t.co) */
  referrer_host?: string;
  /** 처음 연 페이지 경로, 쿼리 없이(예: /share/abc123) */
  landing_path?: string;
  in_app?: InApp;
  /** X(트위터) 광고 클릭 식별자(랜딩 주소의 twclid) — X 전환 API로 결제를 광고 클릭과 잇는 데만 쓴다 */
  twclid?: string;
  /** 이 기록이 생긴 시각(ISO) */
  first_seen_at: string;
}

/** first = 처음 유입(30일 동안 덮어쓰지 않음), last = 이번 방문(새 utm·ref·외부 사이트가 있으면 갱신) */
export interface Attribution {
  first: Touch;
  last: Touch;
}

export const IN_APPS = ["kakaotalk", "instagram", "facebook", "line", "naver", "none"] as const;
export type InApp = (typeof IN_APPS)[number];

/** 처음 유입을 지키는 기간 */
export const FIRST_TOUCH_DAYS = 30;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
// utm 값: 글자·숫자·_ - . 공백만, 64자까지(캠페인 이름이 한글일 수 있어 \p{L} 허용)
const UTM_RE = /^[\p{L}\p{N}_.\- ]{1,64}$/u;
export const SLUG_RE = /^[A-Za-z0-9]{8,16}$/;
const HOST_RE = /^[a-z0-9.-]{1,100}$/;
const PATH_RE = /^\/[A-Za-z0-9_\-/]{0,120}$/;
export const TWCLID_RE = /^[A-Za-z0-9_-]{1,200}$/;

/** User-Agent로 앱 안 브라우저 판별. 모르면 none. */
export function inAppOf(ua: string): InApp {
  if (/KAKAOTALK/i.test(ua)) return "kakaotalk";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/\bLine\//i.test(ua)) return "line";
  if (/NAVER\(inapp/i.test(ua)) return "naver";
  return "none";
}

/** 들어오기 직전 주소에서 도메인만. 이 사이트 자신이거나 읽을 수 없으면 undefined. */
export function referrerHostOf(referrer: string, ownHost: string): string | undefined {
  if (!referrer) return undefined;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === ownHost.toLowerCase().replace(/^www\./, "")) return undefined;
    return HOST_RE.test(host) ? host : undefined;
  } catch {
    return undefined;
  }
}

function cleanUtm(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return UTM_RE.test(t) ? t : undefined;
}

function cleanPath(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const p = v.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return PATH_RE.test(p) ? p : undefined;
}

/** 공유 링크 주소(/share/<slug>)의 코드 */
export function slugFromPath(pathname: string): string | undefined {
  const m = /^\/share\/([A-Za-z0-9]+)\/?$/.exec(pathname);
  return m && SLUG_RE.test(m[1]) ? m[1] : undefined;
}

/** 이번에 연 페이지에서 유입 정보를 읽는다. */
export function readTouch(p: { search: string; pathname: string; referrer: string; userAgent: string; ownHost: string; now: Date }): Touch {
  const q = new URLSearchParams(p.search);
  const t: Touch = { first_seen_at: p.now.toISOString() };
  for (const k of UTM_KEYS) {
    const v = cleanUtm(q.get(k));
    if (v) t[k] = v;
  }
  const ref = q.get("ref");
  if (ref && SLUG_RE.test(ref)) t.ref = ref;
  else {
    const s = slugFromPath(p.pathname);
    if (s) t.ref = s;
  }
  const tw = q.get("twclid");
  if (tw && TWCLID_RE.test(tw)) t.twclid = tw;
  const host = referrerHostOf(p.referrer, p.ownHost);
  if (host) t.referrer_host = host;
  const path = cleanPath(p.pathname);
  if (path) t.landing_path = path;
  t.in_app = inAppOf(p.userAgent);
  return t;
}

/** 새 캠페인 신호가 있는 방문인지(utm·공유 코드·바깥 사이트에서 옴) */
export function hasSignal(t: Touch): boolean {
  return !!(t.utm_source || t.utm_medium || t.utm_campaign || t.ref || t.referrer_host || t.twclid);
}

/**
 * 저장된 값과 이번 방문을 합친다.
 * 처음 유입: 없거나 30일이 지났으면 이번 방문으로, 아니면 그대로.
 * 이번 방문: 새 신호가 있으면 이번 방문으로, 없으면(사이트 안에서 다시 열기·북마크) 예전 값 그대로.
 */
export function mergeTouch(prev: Attribution | null, cur: Touch, now: Date): Attribution {
  if (!prev) return { first: cur, last: cur };
  const age = now.getTime() - Date.parse(prev.first.first_seen_at);
  const firstExpired = !Number.isFinite(age) || age > FIRST_TOUCH_DAYS * 86_400_000;
  return {
    first: firstExpired ? cur : prev.first,
    last: hasSignal(cur) || firstExpired ? cur : prev.last,
  };
}

/** 정해 둔 칸·형식만 남긴다(서버는 브라우저가 보낸 값을 이걸로 한 번 더 거른다). 쓸 수 없으면 null. */
export function sanitizeTouch(raw: unknown): Touch | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.first_seen_at !== "string" || !Number.isFinite(Date.parse(r.first_seen_at)) || r.first_seen_at.length > 40) return null;
  const t: Touch = { first_seen_at: new Date(r.first_seen_at).toISOString() };
  for (const k of UTM_KEYS) {
    const v = cleanUtm(r[k]);
    if (v) t[k] = v;
  }
  if (typeof r.ref === "string" && SLUG_RE.test(r.ref)) t.ref = r.ref;
  if (typeof r.referrer_host === "string" && HOST_RE.test(r.referrer_host)) t.referrer_host = r.referrer_host;
  if (typeof r.twclid === "string" && TWCLID_RE.test(r.twclid)) t.twclid = r.twclid;
  const path = cleanPath(r.landing_path);
  if (path) t.landing_path = path;
  if (typeof r.in_app === "string" && (IN_APPS as readonly string[]).includes(r.in_app)) t.in_app = r.in_app as InApp;
  return t;
}

export function sanitizeAttribution(raw: unknown): Attribution | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const first = sanitizeTouch(r.first);
  const last = sanitizeTouch(r.last);
  if (!first && !last) return null;
  return { first: (first ?? last)!, last: (last ?? first)! };
}

/** 이용 흐름 기록에 붙이는 짧은 값(이번 방문 기준) */
export function attributionProps(t: Touch | null | undefined): Record<string, string> {
  if (!t) return {};
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref", "referrer_host", "in_app"] as const) {
    const v = t[k];
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

// ── 공유 링크 ──

/** 공유 채널(utm_source 값). 공유 시트 버튼과 짝. */
export const SHARE_CHANNELS = ["kakao", "link_copy", "naver_blog", "x", "instagram", "youtube"] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export function isShareChannel(v: unknown): v is ShareChannel {
  return typeof v === "string" && (SHARE_CHANNELS as readonly string[]).includes(v);
}

const SLUG_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** 무작위 공유 코드(10자). 헷갈리는 글자(0·O·1·l·I)는 뺐다. */
export function newSlug(random: (n: number) => Uint8Array): string {
  const bytes = random(10);
  let s = "";
  for (const b of bytes) s += SLUG_CHARS[b % SLUG_CHARS.length];
  return s;
}

/** 공유 링크 주소: /share/<코드>?ref=<코드>&utm_source=<채널>&utm_medium=share */
export function shareUrl(site: string, slug: string, channel: ShareChannel): string {
  return `${site}/share/${slug}?ref=${slug}&utm_source=${channel}&utm_medium=share`;
}
