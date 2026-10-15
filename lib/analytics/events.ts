// 이용 흐름 기록(owner 결정 2026-10-11: "몇 명이 어디서 그만두는지" 모은다). 순수 함수 — 브라우저·서버가 같이 쓴다.
// 기록하는 건 단계 이름과 짧은 값(장 번호·공유 채널·로그인 방법)뿐 — 입력값·출생 정보·답·문장은 절대 넣지 않는다.
// 이벤트 이름은 14_DB설계 funnel_events 목록을 따랐다(q1~q3는 한 화면이라 questions_done 하나).
export const FUNNEL_EVENTS = [
  "intro_view", // 첫 화면
  "start", // 테스트 시작(닉네임 화면)
  "nickname_done",
  "experience_done",
  "birth_done", // 출생 정보 + 동의
  "questions_done",
  "calc_fail",
  "result_view", // props.page 1~7
  "paywall_view", // 결제 카드가 보임(4~7장)
  "pay_click", // 결제 화면 열림
  "pay_start", // 토스 결제창 열기
  "pay_success",
  "pay_fail",
  "report_ready",
  "share_open",
  "share_done", // props.channel
  "save_click",
  "login_done", // props.method
  "sowella_start",
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

export function isFunnelEvent(v: unknown): v is FunnelEvent {
  return typeof v === "string" && (FUNNEL_EVENTS as readonly string[]).includes(v);
}

const SHORT = /^[a-z0-9_-]{1,24}$/;
const UTM = /^[\p{L}\p{N}_.\- ]{1,64}$/u;
const SOURCE_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

/**
 * 허용한 칸만 남긴다: page(1~7 정수), channel·method·from(영문 소문자 짧은 값),
 * 유입 경로(이번 방문): utm 값 4개·ref(공유 코드)·referrer_host(도메인만)·in_app. 그 밖은 버린다.
 */
export function sanitizeProps(raw: unknown): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  if (Number.isInteger(r.page) && (r.page as number) >= 1 && (r.page as number) <= 7) out.page = r.page as number;
  for (const k of ["channel", "method", "from"] as const) if (typeof r[k] === "string" && SHORT.test(r[k] as string)) out[k] = r[k] as string;
  for (const k of SOURCE_KEYS) if (typeof r[k] === "string" && UTM.test(r[k] as string)) out[k] = r[k] as string;
  if (typeof r.ref === "string" && /^[A-Za-z0-9]{8,16}$/.test(r.ref)) out.ref = r.ref;
  if (typeof r.referrer_host === "string" && /^[a-z0-9.-]{1,100}$/.test(r.referrer_host)) out.referrer_host = r.referrer_host;
  if (typeof r.in_app === "string" && SHORT.test(r.in_app)) out.in_app = r.in_app;
  return out;
}

/** 브라우저 식별자 형식(무작위 32자 내외) */
export function isAnonId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(v);
}
