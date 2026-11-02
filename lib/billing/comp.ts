// 결제 없이 전체 리포트를 볼 수 있는 계정(관리자·운영 확인용, owner 2026-10-30).
// 계정 이메일(이메일 가입·카카오) 또는 로그인 제공자가 준 연락처 이메일(네이버)로만 맞춘다 — 사용자가 스스로 바꿀 수 있는
// user_metadata는 쓰지 않는다(getAccountEmail). 더하려면 이 목록이나 Vercel 환경변수 ASTRO_COMP_EMAILS(쉼표로 구분)에 넣는다.
export const COMP_EMAILS = ["seotaiji0124@naver.com"];

/** 기한이 있는 무료 열람(그 시각까지만). owner 2026-11-02: 시험 계정 하루만 */
export const TEMP_COMP: Array<{ email: string; until: string }> = [{ email: "owner-test@ssolwellnesshouse.com", until: "2026-11-02T23:59:59+09:00" }];

export function compEmails(env: string | undefined = process.env.ASTRO_COMP_EMAILS): string[] {
  const extra = (env ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return [...new Set([...COMP_EMAILS.map((e) => e.toLowerCase()), ...extra])];
}

export function isCompEmail(email: string | null | undefined, env?: string, now: Date = new Date()): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (compEmails(env).includes(e)) return true;
  return TEMP_COMP.some((t) => t.email.toLowerCase() === e && now.getTime() <= Date.parse(t.until));
}
