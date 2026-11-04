// 영문 로그인 화면 문구(영문판 (나), 2026-11-04). 로그인 함수(lib/supabase/authClient.ts)는 한국어 오류 문구를 돌려주므로
// 영문 화면에서는 이 표로 바꿔 보여 준다 — 표에 없는 문구는 일반 영문 오류로(한국어가 화면에 나가지 않게, 테스트 있음).
// 영어 문장은 번역 묶음에 없는 것이 대부분이라 Claude 초안(원어민 검수 대상).
const KO_TO_EN: Record<string, string> = {
  "이메일 또는 비밀번호가 올바르지 않아요.": "That email or password doesn’t look right.",
  "이메일 인증이 아직 완료되지 않았어요. 메일함을 확인해 주세요.": "Your email isn’t verified yet. Please check your inbox.",
  "이메일 형식이 올바르지 않아요.": "Please enter a valid email address.",
  "이미 가입된 이메일이에요. 로그인해 주세요.": "This email already has an account. Please log in.",
  "비밀번호는 6자 이상이어야 해요.": "Your password needs at least 6 characters.",
  "설정 오류로 로그인을 사용할 수 없어요.": "Login isn’t available right now. Please try again later.",
  "인증번호가 올바르지 않거나 만료됐어요. 다시 받아 주세요.": "That code is wrong or has expired. Please request a new one.",
  "세션이 만료됐어요. 처음부터 다시 시도해 주세요.": "Your session expired. Please start again.",
  "가입은 됐지만 정보 저장에 실패했어요. 새로고침 후 로그인해서 다시 시도해 주세요.":
    "Your account was created, but we couldn’t save your details. Please refresh, log in and try again.",
};

export const GENERIC_EN_ERROR = "Something went wrong. Please try again in a moment.";

export function authErrorEn(ko: string | undefined): string {
  if (!ko) return GENERIC_EN_ERROR;
  return KO_TO_EN[ko] ?? GENERIC_EN_ERROR;
}
