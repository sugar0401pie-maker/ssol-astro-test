// 영문판 가격(owner 2026-11-04 확정: US$2.99, 단건 결제, 자동 갱신 없음). 금액은 서버가 정한다 — 브라우저 값은 믿지 않는다.
// 주문에는 센트(299)로 저장하고, 토스에는 달러 소수(2.99)로 보낸다(토스 결제창 amount.value, USD).
// 2026-11-12 owner: 해외결제 심사 중(결제 불가)인 동안 한시적으로 US$29.99. 되돌릴 때는 이 숫자만 299로 —
// 화면·메일·약관·번역 DB의 가격 글자는 모두 이 값에서 만든다(enPriceLabel·withEnReportPrice).
export const EN_REPORT_PRICE_CENTS = 2999;
export const EN_CURRENCY = "USD" as const;
export const EN_ORDER_NAME = "SSOL Astro House star report";

export const centsToUsd = (cents: number) => Math.round(cents) / 100;
/** 토스가 돌려준 달러 금액(2.99 등)을 센트로 — 소수 비교 오차를 피하려고 센트로 맞춰 비교한다 */
export const usdToCents = (usd: number) => Math.round(usd * 100);

/** 화면·메일·약관에 쓰는 가격 글자(US$29.99) — EN_REPORT_PRICE_CENTS에서 만든다 */
export const enPriceLabel = (cents: number = EN_REPORT_PRICE_CENTS) => `US$${(cents / 100).toFixed(2)}`;

/** 문장 속 달러 가격(US$2.99·$2.99)을 지금 가격으로 — 번역 DB·약관 문장에 예전 가격 글자가 박혀 있어서 */
export function withEnReportPrice(text: string): string {
  return text.replace(/(US)?\$\d+(\.\d{2})?/g, (_m, us) => (us ? enPriceLabel() : enPriceLabel().slice(2)));
}

export type EnPayMethod = "card" | "paypal";

/**
 * 영문 결제 키 = 해외결제 상점(별도 MID) 키만 쓴다(owner 2026-11-06).
 * 예전에는 없으면 한국어판(원화 상점) 키로 넘어갔는데, 그 '대신 쓰기'가 설정 실수를 가려 2003만 계속 났다 —
 * 이제 해외결제 키가 없으면 결제를 열지 않는다(주문 API 503, 화면은 '결제를 열 수 없어요'). 원화 상점으로는 절대 넘어가지 않는다.
 */
export const enTossSecret = () => process.env.TOSS_EN_SECRET_KEY;
export const enTossClientKey = () => process.env.NEXT_PUBLIC_TOSS_EN_CLIENT_KEY;
export const enPaymentsConfigured = () => !!enTossSecret() && !!enTossClientKey();

/** 키 종류: 결제위젯 키(…_gck_…)면 토스 결제위젯, API 개별 연동 키(…_ck_…)면 토스 결제창을 바로 연다. */
export function tossKeyKind(clientKey: string | undefined): "widget" | "api" | null {
  if (!clientKey) return null;
  if (/_gck_/.test(clientKey)) return "widget";
  if (/_ck_/.test(clientKey)) return "api";
  return null;
}
