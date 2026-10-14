// 결제 후 리포트를 쓰는 동안 별 아래에서 3초마다 바뀌는 문구(owner 요청 2026-10-14, 문구는 Claude 초안 — owner 검토 가능).
// 별자리 → 2027 → 5년 → 리포트 순서로 돌고, 끝나면 처음부터(owner 2026-10-14: 별자리 문장 + 3개).
// '운세를 점친다' 같은 예측 표현은 쓰지 않는다(점성술은 예측 도구가 아니라 자기성찰 콘텐츠 — 안전 원칙).
export const WRITING_INTERVAL_MS = 3000;

const TEMPLATES = [
  "{이름}님의 별자리를 그려 보고 있어요..",
  "{이름}님의 2027년 하늘을 읽어 보고 있어요..",
  "앞으로 5년, 별들이 지나갈 길을 따라가 보고 있어요..",
  "별빛을 모아 {이름}님만의 리포트를 쓰고 있어요..",
] as const;

export function writingMessages(nickname: string): string[] {
  const name = nickname.trim();
  // 닉네임이 없으면 '당신님'이 되지 않게 '당신'으로
  return TEMPLATES.map((t) => t.replaceAll("{이름}님", name ? `${name}님` : "당신"));
}
