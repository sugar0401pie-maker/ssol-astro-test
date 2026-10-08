// 결과 저장 동의 문구(마스터스펙 8-1: 출생일시·출생지는 민감정보 — 수집 목적·보관기간 동의를 받는다).
// ⚠ 초안(Claude 작성, owner·법무 검토 전). 문구를 바꾸면 CONSENT_VERSION도 바꿔서 누가 어떤 문구에 동의했는지 남긴다.
// 보관기간은 아직 정해지지 않아 '삭제 요청·탈퇴 시 삭제'만 적었다 — 기간이 정해지면 문구와 버전을 함께 고친다.
export const CONSENT_VERSION = "astro-results-2026-10-08-draft";

export const CONSENT_TITLE = "결과 저장 동의";

export const CONSENT_LINES = [
  "결과를 저장하고 나중에 다시 보여 드리기 위해 생년월일, 태어난 시간, 태어난 곳(도시 이름과 좌표)과 세 가지 질문의 답을 저장해요.",
  "출생 정보는 출생차트를 계산하고 결과를 다시 보여 드리는 데에만 사용하고, 다른 목적으로 쓰지 않아요.",
  "저장한 결과는 '내 결과'에서 언제든 지울 수 있고, 회원 탈퇴 시 함께 지워져요.",
] as const;

export const CONSENT_CHECK_LABEL = "위 내용을 확인했고, 결과 저장에 동의합니다. (필수)";

// 이 사이트의 자체 법적 고지 페이지(app/legal/page.tsx, 2026-10-08 owner 요청으로 쏘웰라 페이지에서 분리).
export const PRIVACY_URL = "/legal#privacy";
export const SENSITIVE_URL = "/legal#sensitive";
export const TERMS_URL = "/legal#terms";
