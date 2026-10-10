// 결과 저장 동의 문구(마스터스펙 8-1: 출생일시·출생지는 민감정보 — 수집 목적·보관기간 동의를 받는다).
// ⚠ 초안(Claude 작성, owner·법무 검토 전). 문구를 바꾸면 CONSENT_VERSION도 바꿔서 누가 어떤 문구에 동의했는지 남긴다.
// 보관기간은 아직 정해지지 않아 '삭제 요청·탈퇴 시 삭제'만 적었다 — 기간이 정해지면 문구와 버전을 함께 고친다.
export const CONSENT_VERSION = "astro-results-2026-10-10-draft"; // 10-10: 임시 계정 동의는 로그인 없이 테스트할 때(익명)만(owner 결정). 10-09: 생년월일 화면 필수 체크, 문구는 04_데이터.json 4_birth.consents

// 이 사이트의 자체 법적 고지 페이지(app/legal/page.tsx, 2026-10-08 owner 요청으로 쏘웰라 페이지에서 분리).
export const PRIVACY_URL = "/legal#privacy";
export const SENSITIVE_URL = "/legal#sensitive";
export const TERMS_URL = "/legal#terms";

export const CONSENT_TITLE = "결과 저장 동의";

export const CONSENT_LINES = [
  "결과를 저장하고 나중에 다시 보여 드리기 위해 생년월일, 태어난 시간, 태어난 곳(도시 이름과 좌표)과 세 가지 질문의 답을 저장해요.",
  "출생 정보는 출생차트를 계산하고 결과를 다시 보여 드리는 데에만 사용하고, 다른 목적으로 쓰지 않아요.",
  "로그인하지 않고 저장한 결과는 이 기기(브라우저)에서만 볼 수 있어요. 30일(결제한 결과는 결제일로부터 30일) 안에 가입·로그인하지 않으면 자동으로 지워지고, 가입·로그인하면 계정으로 옮겨져요.",
  "저장한 결과는 '내 결과'에서 언제든 지울 수 있고, 회원 탈퇴 시 함께 지워져요.",
] as const;

export const CONSENT_CHECK_LABEL = "위 내용을 확인했고, 결과 저장에 동의합니다. (필수)";

// 생년월일·태어난 곳 입력 화면의 필수 체크 3가지(owner 결정 2026-10-09: 셋 다 체크해야 다음으로 넘어간다).
export type ConsentItemId = "age" | "privacy" | "terms" | "store";
// 문구는 04_데이터.json(4_birth.consents) 그대로 + 두 가지를 덧붙였다(Claude 판단, owner 검토 가능):
// ① 출생 정보는 민감정보라 개인정보 처리방침 옆에 민감정보 처리방침 링크도 둔다 ② 임시 저장이 30일 뒤 지워진다는 사실(보관기간 고지).
export const CONSENT_ITEMS: ReadonlyArray<{ id: ConsentItemId; label: string; note?: string; link?: { href: string; text: string }; extraLink?: { href: string; text: string } }> = [
  // 2026-10-10 패키지: 개인정보보호법상 만 14세 미만은 보호자 동의가 필요해 이용 대상에서 뺀다(04_데이터.json agree-age).
  { id: "age", label: "[필수] 만 14세 이상입니다" },
  { id: "privacy", label: "[필수] 개인정보 처리방침에 동의합니다", link: { href: PRIVACY_URL, text: "보기" }, extraLink: { href: SENSITIVE_URL, text: "민감정보 처리방침" } },
  { id: "terms", label: "[필수] 이용약관에 동의합니다", link: { href: TERMS_URL, text: "보기" } },
  {
    id: "store",
    label: "[필수] 임시 계정 생성 및 결과 저장에 동의합니다",
    note: "입력하신 생년월일·태어난 시간·태어난 곳과 결과를 저장하기 위해 임시 계정을 만들어요. 로그인하면 내 계정으로 옮겨집니다. 로그인하지 않으면 이 기기에서만 볼 수 있고 30일 뒤 지워져요.",
  },
];

/** 하나라도 빠졌을 때(04_데이터.json 4_birth.consents.error) */
export const CONSENT_ERROR = "필수 항목에 모두 동의해 주세요.";

/**
 * 이 사람에게 보여 줄 필수 동의(owner 결정 2026-10-10): '임시 계정 생성 및 결과 저장'은 로그인 없이(익명) 테스트할 때만.
 * 로그인한 사람은 만 14세·개인정보 처리방침·이용약관 세 가지(결과 저장은 개인정보 처리방침의 수집·이용 항목으로 안내).
 * guest를 모르면(로그인 확인 전) true로 — 동의를 하나 더 받는 쪽이 안전하다(fail safe).
 */
export function consentItemsFor(guest: boolean) {
  return guest ? CONSENT_ITEMS : CONSENT_ITEMS.filter((c) => c.id !== "store");
}

/** 보이는 항목을 모두 체크했는지(하나라도 빠지면 다음으로 못 넘어간다) */
export function allConsented(checked: Partial<Record<ConsentItemId, boolean>>, guest = true): boolean {
  return consentItemsFor(guest).every((c) => checked[c.id] === true);
}

