// 유료 리포트 가격(마스터스펙 6-2 확정: 1,900원). 쏘웰라 이용권은 따로 지급하지 않는다(owner 2026-10-08, 안내 문구도
// 2026-10-15 DB v1.2.4에서 삭제). 금액은 서버가 주문을 만들 때 이 값으로 정한다(브라우저 값 무시).
export const REPORT_PRICE = 1900;
export const REPORT_ORDER_NAME = "쏠 아스트로 하우스 전체 리포트";

/** 화면에 쓰는 가격 글자("1,900원") */
export const reportPriceLabel = (): string => `${REPORT_PRICE.toLocaleString("ko-KR")}원`;

/**
 * DB 문장에 박힌 금액("1,900원")을 실제 가격으로 바꾼다 — 가격을 바꿨는데 화면 글자만 옛 금액으로 남아
 * 실제 결제 금액과 어긋나는 일을 막는다(2026-10-12 점검, owner 결정 A).
 */
export function withReportPrice(text: string): string {
  return text.replace(/\d{1,3}(,\d{3})*원/g, reportPriceLabel());
}
