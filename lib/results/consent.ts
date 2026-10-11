// 결과 저장 동의 문구(마스터스펙 8-1: 출생일시·출생지는 민감정보 — 수집 목적·보관기간 동의를 받는다).
// ⚠ 초안(Claude 작성, owner·법무 검토 전). 문구를 바꾸면 CONSENT_VERSION도 바꿔서 누가 어떤 문구에 동의했는지 남긴다.
// 보관기간은 아직 정해지지 않아 '삭제 요청·탈퇴 시 삭제'만 적었다 — 기간이 정해지면 문구와 버전을 함께 고친다.
// 10-11: 임시 계정 동의는 따로 체크하지 않고 이용약관(제5조)·개인정보 처리방침에 포함(owner). 10-10: 임시 계정 동의는 익명일 때만. 10-09: 생년월일 화면 필수 체크.
export const CONSENT_VERSION = "astro-results-2026-10-11-draft";

// 이 사이트의 자체 법적 고지 페이지(app/legal/page.tsx, 2026-10-08 owner 요청으로 쏘웰라 페이지에서 분리).
export const PRIVACY_URL = "/legal#privacy";
/** 리포트 요약의 쏘웰라 대화 활용 조항(쏘웰라 버튼 아래 [자세히]) */
export const SOWELLA_USE_URL = "/legal#sowella";
export const SENSITIVE_URL = "/legal#sensitive";
export const TERMS_URL = "/legal#terms";

// 생년월일·태어난 곳 입력 화면의 필수 체크(owner 결정 2026-10-09: 모두 체크해야 다음으로 넘어간다).
export type ConsentItemId = "age" | "privacy" | "terms" | "store";
// 문구는 04_데이터.json(4_birth.consents) 그대로 + 두 가지를 덧붙였다(Claude 판단, owner 검토 가능):
// ① 출생 정보는 민감정보라 개인정보 처리방침 옆에 민감정보 처리방침 링크도 둔다 ② 임시 저장이 30일 뒤 지워진다는 사실(보관기간 고지).
export interface ConsentItem {
  id: ConsentItemId;
  label: string;
  note?: string;
  link?: { href: string; text: string };
  extraLink?: { href: string; text: string };
}
export const CONSENT_ITEMS: ReadonlyArray<ConsentItem> = [
  // 2026-10-10 패키지: 개인정보보호법상 만 14세 미만은 보호자 동의가 필요해 이용 대상에서 뺀다(04_데이터.json agree-age).
  { id: "age", label: "[필수] 만 14세 이상입니다" },
  { id: "privacy", label: "[필수] 개인정보 처리방침에 동의합니다", link: { href: PRIVACY_URL, text: "보기" }, extraLink: { href: SENSITIVE_URL, text: "민감정보 처리방침" } },
  { id: "terms", label: "[필수] 이용약관에 동의합니다", link: { href: TERMS_URL, text: "보기" } },
];

/** 하나라도 빠졌을 때(04_데이터.json 4_birth.consents.error) */
export const CONSENT_ERROR = "필수 항목에 모두 동의해 주세요.";

/** 로그인한 사람의 저장 동의(패키지 v3 04_데이터.json agree-save + 쏘웰라 활용 고지 초안 ②) */
const SAVE_ITEM: ConsentItem = {
  id: "store",
  label: "[필수] 입력 정보와 결과 저장에 동의합니다",
  note: "입력하신 생년월일·태어난 시간·태어난 곳과 결과를 내 계정에 저장해, 다시 보거나 태어난 시간을 고칠 수 있게 해요. 쏘웰라와 대화를 시작하면 리포트 요약(유형·답변·흐름)이 맞춤 대화에 쓰여요. 출생 시각과 장소는 넘어가지 않아요.",
};

/** 로그인하지 않은 사람: 따로 체크하지 않고 이용약관 항목 아래 안내만(내용은 이용약관 제5조·개인정보 처리방침에 포함 — owner 2026-10-11) */
export const GUEST_TERMS_NOTE =
  "로그인하지 않고 이용하면 결과 저장·결제를 위해 임시 계정이 만들어져요. 결과는 이 기기에서만 볼 수 있고, 30일 안에 로그인하지 않으면 지워져요(이용약관 제5조).";

/**
 * 이 사람에게 보여 줄 필수 동의.
 * 로그인 없이(익명·비회원) → 만 14세·개인정보·이용약관 3가지(임시 계정 내용은 이용약관에 포함, 따로 체크 없음 — owner 2026-10-11),
 * 로그인 → 3가지 + '입력 정보와 결과 저장'(내 계정에 저장).
 */
export function consentItemsFor(guest: boolean): ReadonlyArray<ConsentItem> {
  return guest ? CONSENT_ITEMS.map((c) => (c.id === "terms" ? { ...c, note: GUEST_TERMS_NOTE } : c)) : [...CONSENT_ITEMS, SAVE_ITEM];
}

/** 보이는 항목을 모두 체크했는지(하나라도 빠지면 다음으로 못 넘어간다) */
export function allConsented(checked: Partial<Record<ConsentItemId, boolean>>, guest = true): boolean {
  return consentItemsFor(guest).every((c) => checked[c.id] === true);
}

