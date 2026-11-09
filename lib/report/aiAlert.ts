// AI 호출이 '설정 문제'로 실패하면 운영자에게 메일로 알린다(owner 2026-11-08: 키가 막혀도 리포트가 DB 문장으로
// 조용히 나가 아무도 몰랐다). 리포트는 그대로 DB 문장으로 나가고(fail safe), 알림만 더한다.
// 순수 부분(분류·한 시간 묶기)은 여기, 메일 보내기는 notifyAiFailure.

export type AiFailureKind = "auth" | "quota" | "model" | "rate";

/** OpenAI SDK 오류(status·code)를 알림 종류로. 일시적인 오류(시간 초과·500대)는 알리지 않는다(null). */
export function classifyAiError(e: unknown): AiFailureKind | null {
  if (!e || typeof e !== "object") return null;
  const status = (e as { status?: unknown }).status;
  const code = String((e as { code?: unknown }).code ?? "");
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return code === "insufficient_quota" ? "quota" : "rate";
  if (status === 404 || code === "model_not_found") return "model";
  return null;
}

export const AI_ALERT_TEXT: Record<AiFailureKind, string> = {
  auth: "OpenAI 키가 거절됐어요(401/403). 키가 만료·삭제됐거나 Vercel의 OPENAI_API_KEY 값이 틀렸을 수 있어요.",
  quota: "OpenAI 크레딧이 바닥났어요(429 insufficient_quota). platform.openai.com → Billing에서 충전해 주세요.",
  model: "OpenAI가 모델을 찾지 못했어요(404). Vercel의 REPORT_MODEL 값이 실제 모델 이름과 맞는지 확인해 주세요.",
  rate: "OpenAI 요청 한도에 걸렸어요(429). 잠깐이면 풀리지만, 자주 오면 사용 한도(Usage limits)를 확인해 주세요.",
};

const WINDOW_MS = 60 * 60 * 1000;

/** 같은 종류 알림은 한 시간에 한 번만(서버 인스턴스 메모리 — 인스턴스마다 따로 셈, 최선 노력) */
export function shouldAlert(last: Map<AiFailureKind, number>, kind: AiFailureKind, now: number): boolean {
  const t = last.get(kind);
  if (t !== undefined && now - t < WINDOW_MS) return false;
  last.set(kind, now);
  return true;
}

/** 알림 받는 곳(owner 2026-11-08). Vercel OPS_ALERT_EMAIL(쉼표로 여러 개)이 있으면 그 목록을 쓴다. */
export const DEFAULT_ALERT_EMAILS = ["contact@ssolwellness.com", "sugar0401pie@gmail.com", "cso@ssolwellness.com"];

export function alertRecipients(env: string | undefined): string[] {
  const list = (env ?? "").split(",").map((s) => s.trim()).filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
  return list.length ? [...new Set(list)] : DEFAULT_ALERT_EMAILS;
}
