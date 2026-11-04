// 영문판 가격(owner 2026-11-04 확정: US$2.99, 단건 결제, 자동 갱신 없음). 금액은 서버가 정한다 — 브라우저 값은 믿지 않는다.
// 주문에는 센트(299)로 저장하고, 토스에는 달러 소수(2.99)로 보낸다(토스 결제창 amount.value, USD).
export const EN_REPORT_PRICE_CENTS = 299;
export const EN_CURRENCY = "USD" as const;
export const EN_ORDER_NAME = "SSOL Astro House star report";

export const centsToUsd = (cents: number) => Math.round(cents) / 100;
/** 토스가 돌려준 달러 금액(2.99 등)을 센트로 — 소수 비교 오차를 피하려고 센트로 맞춰 비교한다 */
export const usdToCents = (usd: number) => Math.round(usd * 100);

/**
 * 영문 결제는 한국어판과 같은 토스 결제위젯 키를 쓴다(외화결제 UI variantKey 'dollaronly' — owner 2026-11-04).
 * TOSS_EN_SECRET_KEY(API 개별 연동 키)는 토스가 '계약된 곳이 아닙니다'로 거절해서 쓰지 않는다.
 */
export const enTossSecret = () => process.env.TOSS_SECRET_KEY;
export const enPaymentsConfigured = () => !!enTossSecret() && !!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
