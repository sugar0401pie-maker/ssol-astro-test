// 결과 저장 횟수 제한(owner 2026-10-26). 로그인 없이 테스트를 시작하게 바꾸면서, 자동 프로그램이 결과를 끝없이 저장해
// DB를 채우지 않게 한다. AI 비용과는 무관하다(아스트로는 결제 전에 AI를 부르지 않는다).
// - 같은 기기(비회원 열쇠) 또는 같은 계정: 최근 24시간에 DAILY_SAVE_LIMIT개(기본 3) — DB에 저장된 결과 수로 센다(서버 인스턴스와 무관하게 정확).
// - 같은 IP: 최근 24시간에 IP_SAVE_LIMIT개, 최근 7일에 IP_WEEK_LIMIT개 — 열쇠를 바꿔 가며 보내는 자동 프로그램 대비.
//   통신사·회사·가족은 여러 사람이 한 IP를 함께 쓰므로 넉넉하게 둔다. 7일 한도는 '며칠 연속 하루 한도를 채우는 주소는
//   더 오래 막기'(owner 2026-10-26 (나)) — 하루 한도를 3일 꽉 채우면 그 저장들이 7일을 지나 빠질 때까지 막힌다.
//   IP는 해시(HMAC)로만 astro_save_ip_log에 7일 보관(ipLog.ts). 표가 없거나 실패하면 서버 메모리로 하루 한도만 센다.

export const DAY_MS = 24 * 60 * 60_000;
export const WEEK_MS = 7 * DAY_MS;
export const IP_SAVE_LIMIT = { max: 20, windowMs: DAY_MS };
export const IP_WEEK_LIMIT = 60;

/** 이 IP의 저장을 막아야 하는지(최근 24시간·7일 저장 수) */
export function ipBlocked(count24h: number, count7d: number): boolean {
  return count24h >= IP_SAVE_LIMIT.max || count7d >= IP_WEEK_LIMIT;
}

/** 하루 저장 한도. 환경변수 RESULT_DAILY_LIMIT(1~100 정수)로 바꿀 수 있고, 값이 이상하면 기본 3. */
export function dailySaveLimit(raw: string | undefined = process.env.RESULT_DAILY_LIMIT): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : 3;
}

export const SAVE_LIMIT_MESSAGE = (limit: number) =>
  `결과는 하루에 ${limit}번까지 만들 수 있어요. 내일 다시 해 주세요. 이미 만든 결과는 [내 결과 보기]에서 다시 볼 수 있어요.`;
