// 검색엔진용 설정(owner 2026-10-29). 검색에 나와도 되는 공개 페이지만 사이트맵에 넣고,
// 개인 결과·결제·로그인·API·공유 링크·테스트 중간 화면은 검색엔진이 가져가지 않게 막는다(robots.txt).
export const SITE_URL = "https://astro.ssolwellnesshouse.com";

/** 사이트맵에 넣는 공개 경로 */
export const PUBLIC_PATHS = ["/", "/legal"] as const;

/** 검색엔진이 가져가지 않을 경로(앞부분 일치) */
export const DISALLOW_PATHS = ["/api/", "/results", "/checkout", "/login", "/share/", "/test/"] as const;

// 검색 결과에 보이는 제목·설명. '운세'·'미래 예측' 같은 말은 쓰지 않는다(점성술은 예측 도구가 아님 — CLAUDE.md §2).
export const SEO_TITLE = "쏠 아스트로 하우스 | 출생차트로 보는 나의 별 리포트";
export const SEO_DESCRIPTION =
  "생년월일과 태어난 곳으로 출생차트를 그려 별자리·4원소·나의 유형을 알아보고, 2026년을 돌아보며 나를 성찰하는 쏠 웰니스 하우스의 무료 점성술 테스트. 예측 도구가 아니며 진단·상담을 대신하지 않습니다.";
