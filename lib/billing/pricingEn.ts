// 영문판 가격(owner 2026-11-04 확정: US$2.99, 단건 결제, 자동 갱신 없음). 금액은 서버가 정한다 — 브라우저 값은 믿지 않는다.
// 주문에는 센트(299)로 저장하고, 토스에는 달러 소수(2.99)로 보낸다(토스 결제창 amount.value, USD).
export const EN_REPORT_PRICE_CENTS = 299;
export const EN_CURRENCY = "USD" as const;
export const EN_ORDER_NAME = "SSOL Astro House star report";

export const centsToUsd = (cents: number) => Math.round(cents) / 100;
/** 토스가 돌려준 달러 금액(2.99 등)을 센트로 — 소수 비교 오차를 피하려고 센트로 맞춰 비교한다 */
export const usdToCents = (usd: number) => Math.round(usd * 100);

export type EnPayMethod = "card" | "paypal";

/**
 * 영문 결제 키(2026-11-06): 해외결제는 별도 상점 아이디(MID)로 계약됐다(owner) — 그 상점 키를
 * NEXT_PUBLIC_TOSS_EN_CLIENT_KEY / TOSS_EN_SECRET_KEY에 넣으면 그것을 쓰고, 없으면 예전처럼 한국어판 결제위젯 키.
 * 한국어판(원화) 상점 키로 USD를 요청하면 토스가 2003 '계약된 결제수단이 아닙니다'로 거절한다.
 */
export const enTossSecret = () => process.env.TOSS_EN_SECRET_KEY || process.env.TOSS_SECRET_KEY;
export const enTossClientKey = () => process.env.NEXT_PUBLIC_TOSS_EN_CLIENT_KEY || process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
export const enPaymentsConfigured = () => !!enTossSecret() && !!enTossClientKey();

/** 키 종류: 결제위젯 키(…_gck_…)면 토스 결제위젯, API 개별 연동 키(…_ck_…)면 토스 결제창을 바로 연다. */
export function tossKeyKind(clientKey: string | undefined): "widget" | "api" | null {
  if (!clientKey) return null;
  if (/_gck_/.test(clientKey)) return "widget";
  if (/_ck_/.test(clientKey)) return "api";
  return null;
}
