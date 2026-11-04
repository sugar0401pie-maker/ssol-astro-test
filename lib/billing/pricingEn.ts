// 영문판 가격(owner 2026-11-04 확정: US$2.99, 단건 결제, 자동 갱신 없음). 금액은 서버가 정한다 — 브라우저 값은 믿지 않는다.
// 주문에는 센트(299)로 저장하고, 토스에는 달러 소수(2.99)로 보낸다(토스 결제창 amount.value, USD).
export const EN_REPORT_PRICE_CENTS = 299;
export const EN_CURRENCY = "USD" as const;
export const EN_ORDER_NAME = "SSOL Astro House star report";

export const centsToUsd = (cents: number) => Math.round(cents) / 100;
/** 토스가 돌려준 달러 금액(2.99 등)을 센트로 — 소수 비교 오차를 피하려고 센트로 맞춰 비교한다 */
export const usdToCents = (usd: number) => Math.round(usd * 100);

/** 결제 방식: 해외카드(Visa·Mastercard·JCB, 다국어 결제창) 또는 PayPal(토스 해외간편결제) — 둘 다 USD */
export type EnPayMethod = "card" | "paypal";
export const isEnPayMethod = (v: unknown): v is EnPayMethod => v === "card" || v === "paypal";

/** 서버에 해외결제 키가 있는지(없으면 영문 결제를 열지 않는다) */
export const enPaymentsConfigured = () => !!process.env.TOSS_EN_SECRET_KEY;
