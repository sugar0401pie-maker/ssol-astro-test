// 검색엔진용 설정(owner 2026-10-29). 검색에 나와도 되는 공개 페이지만 사이트맵에 넣고,
// 개인 결과·결제·로그인·API·공유 링크·테스트 중간 화면은 검색엔진이 가져가지 않게 막는다(robots.txt).
export const SITE_URL = "https://astro.ssolwellnesshouse.com";

/** 사이트맵에 넣는 공개 경로 — /about/<주제>는 lib/about/content.ts SUB_PAGES와 같아야 한다(테스트가 확인) */
export const PUBLIC_PATHS = [
  "/",
  "/about",
  "/about/how-it-works",
  "/about/report",
  "/about/trust",
  "/about/privacy-refund",
  "/about/signs",
  "/legal",
] as const;

/** 12별자리 페이지(/about/signs/<영문>) — 해석 DB A1의 영문명과 같아야 한다(테스트가 확인) */
export const SIGN_SLUGS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;
/** 12별자리 페이지 내용이 마지막으로 바뀐 날(KST) — 별자리 문장(해석 DB A1~A4)을 바꾸면 이 날짜도 바꾼다 */
export const SIGN_PAGES_UPDATED = "2026-11-15";

/**
 * 페이지 내용이 마지막으로 바뀐 날(KST, sitemap lastmod). 그 페이지 글을 고치면 이 날짜도 바꾼다 —
 * 배포 때 IndexNow가 lastmod가 오늘인 주소만 검색엔진에 알리므로(scripts/indexnow.mjs), 안 바꾸면 알림이 안 간다.
 */
export const PAGE_UPDATED: Record<(typeof PUBLIC_PATHS)[number], string> = {
  "/": "2026-11-21",
  "/about": "2026-11-21",
  "/about/how-it-works": "2026-11-05",
  "/about/report": "2026-11-05",
  "/about/trust": "2026-11-21",
  "/about/privacy-refund": "2026-11-05",
  "/about/signs": "2026-11-15",
  "/legal": "2026-10-26",
};

/** 검색엔진이 가져가지 않을 경로(앞부분 일치) */
export const DISALLOW_PATHS = ["/api/", "/results", "/checkout", "/login", "/share/", "/test/", "/admin"] as const;

// 검색 결과 제목·설명 — owner 지정 문구 그대로(2026-11-21, 2026-11-04 문구를 대체). 바꿀 때도 owner 문구 그대로 쓴다.
export const SEO_TITLE = "쏠 아스트로 하우스 | 심리상담 전문 점성가가 풀어주는 소름돋는 점성술";
export const SEO_DESCRIPTION =
  "무의식중의 속마음까지 간파하는 정확한 점성술, 지금 바로 출생차트와 2026년 회고까지 무료로 확인해 보세요. 단돈 1,900원에 심리학자의 별 리포트 해설과 제안까지 읽어볼 수 있어요.";
// 공유 미리보기(Open Graph·X) 설명 — 2026-11-04 문구 그대로(owner 2026-11-21: 이번에는 바꾸지 않음)
export const OG_DESCRIPTION =
  "사주보다 더 소름돋는 점성술! 올 해는 어땠는지, 2027년은 어떨지 무료로 알아보세요 - 향후 5년간의 미래까지 보여드리고, 그에 맞는 웰니스 제안까지 덧붙여드립니다.";
