// 결과 저장 동의 문구(마스터스펙 8-1: 출생일시·출생지는 민감정보 — 수집 목적·보관기간 동의를 받는다).
// ⚠ 초안(Claude 작성, owner·법무 검토 전). 문구를 바꾸면 CONSENT_VERSION도 바꿔서 누가 어떤 문구에 동의했는지 남긴다.
// 보관기간은 아직 정해지지 않아 '삭제 요청·탈퇴 시 삭제'만 적었다 — 기간이 정해지면 문구와 버전을 함께 고친다.
export const CONSENT_VERSION = "astro-results-2026-10-09-draft"; // 10-09: 생년월일 화면에서 개인정보처리방침·약관·저장 3가지 필수 체크(owner 결정)

// 이 사이트의 자체 법적 고지 페이지(app/legal/page.tsx, 2026-10-08 owner 요청으로 쏘웰라 페이지에서 분리).
export const PRIVACY_URL = "/legal#privacy";
export const SENSITIVE_URL = "/legal#sensitive";
export const TERMS_URL = "/legal#terms";

export const CONSENT_TITLE = "결과 저장 동의";

export const CONSENT_LINES = [
  "결과를 저장하고 나중에 다시 보여 드리기 위해 생년월일, 태어난 시간, 태어난 곳(도시 이름과 좌표)과 세 가지 질문의 답을 저장해요.",
  "출생 정보는 출생차트를 계산하고 결과를 다시 보여 드리는 데에만 사용하고, 다른 목적으로 쓰지 않아요.",
  "로그인하지 않고 저장한 결과는 이 기기(브라우저)에서만 볼 수 있어요. 30일(결제한 결과는 1년) 안에 가입·로그인하지 않으면 자동으로 지워지고, 가입·로그인하면 계정으로 옮겨져요.",
  "저장한 결과는 '내 결과'에서 언제든 지울 수 있고, 회원 탈퇴 시 함께 지워져요.",
] as const;

export const CONSENT_CHECK_LABEL = "위 내용을 확인했고, 결과 저장에 동의합니다. (필수)";

// 생년월일·태어난 곳 입력 화면의 필수 체크 3가지(owner 결정 2026-10-09: 셋 다 체크해야 다음으로 넘어간다).
export type ConsentItemId = "privacy" | "terms" | "store";
export const CONSENT_ITEMS: ReadonlyArray<{ id: ConsentItemId; label: string; link?: { href: string; text: string } }> = [
  { id: "privacy", label: "개인정보처리방침·민감정보 처리방침에 동의합니다. (필수)", link: { href: PRIVACY_URL, text: "보기" } },
  { id: "terms", label: "이용약관에 동의합니다. (필수)", link: { href: TERMS_URL, text: "보기" } },
  { id: "store", label: "결과를 보여 드리기 위해 입력한 정보가 저장되는 것에 동의합니다. 로그인하지 않으면 이 기기에만 임시로 저장되고 30일 뒤 지워져요. (필수)" },
];

/** 세 가지 모두 체크했는지(하나라도 빠지면 다음으로 못 넘어간다) */
export function allConsented(checked: Partial<Record<ConsentItemId, boolean>>): boolean {
  return CONSENT_ITEMS.every((c) => checked[c.id] === true);
}

