// X(트위터) 광고 전환 설정 — owner 요청 2026-10-16. 브라우저(픽셀)·서버(전환 API)가 같이 쓰는 값(비밀값 아님).
export const X_PIXEL_ID = "rh4ou";

/**
 * 보낼 전환 이벤트 ID(X 이벤트 관리자에서 복사, 형식 tw-rh4ou-xxxxx). 비어 있으면(null) 그 전환은 보내지 않는다.
 * purchase = 유료 리포트 결제 완료(서버가 토스 승인을 확인한 결제만).
 */
export const X_EVENT_IDS: { purchase: string | null } = {
  purchase: "tw-rh4ou-rhcgf", // owner 전달 2026-10-16(유형: 구매)
};

export function isXEventId(v: string | null | undefined): v is string {
  return typeof v === "string" && new RegExp(`^tw-${X_PIXEL_ID}-[a-z0-9]+$`).test(v);
}
