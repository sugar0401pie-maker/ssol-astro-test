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
  "/legal",
] as const;

/**
 * 페이지 내용이 마지막으로 바뀐 날(KST, sitemap lastmod). 그 페이지 글을 고치면 이 날짜도 바꾼다 —
 * 배포 때 IndexNow가 lastmod가 오늘인 주소만 검색엔진에 알리므로(scripts/indexnow.mjs), 안 바꾸면 알림이 안 간다.
 */
export const PAGE_UPDATED: Record<(typeof PUBLIC_PATHS)[number], string> = {
  "/": "2026-11-14",
  "/about": "2026-11-14",
  "/about/how-it-works": "2026-11-05",
  "/about/report": "2026-11-05",
  "/about/trust": "2026-11-05",
  "/about/privacy-refund": "2026-11-05",
  "/legal": "2026-10-26",
};

/** 검색엔진이 가져가지 않을 경로(앞부분 일치) */
export const DISALLOW_PATHS = ["/api/", "/results", "/checkout", "/login", "/share/", "/test/", "/admin"] as const;

// 검색 결과·공유 미리보기 제목·설명 — owner 지정 문구 그대로(2026-11-04). 바꿀 때도 owner 문구 그대로 쓴다.
export const SEO_TITLE = "쏠 아스트로 하우스 | 2027년 별자리 운세를 무료로 알아보세요";
export const SEO_DESCRIPTION =
  "사주보다 더 소름돋는 점성술! 올 해는 어땠는지, 2027년은 어떨지 무료로 알아보세요 - 향후 5년간의 미래까지 보여드리고, 그에 맞는 웰니스 제안까지 덧붙여드립니다.";
