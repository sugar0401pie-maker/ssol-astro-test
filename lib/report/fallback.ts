// 리포트가 AI 없이(해석 DB 문장만으로) 나갔는지 — 생성 기록(report.log.parts[*].result)으로 판단. 순수 함수.
type Logged = { partial?: boolean; log?: { parts?: Record<string, { result?: string } | undefined> } } | null | undefined;

/** 파트 중 하나라도 'db'로 나갔으면 true(쓰는 중인 partial은 제외) */
export function usedDbFallback(report: unknown): boolean {
  const r = report as Logged;
  if (!r || r.partial || !r.log?.parts) return false;
  return Object.values(r.log.parts).some((p) => p?.result === "db");
}

/** 모든 파트를 AI로 썼으면 true(파트 기록이 없으면 false) */
export function allPartsAi(report: unknown): boolean {
  const parts = Object.values((report as Logged)?.log?.parts ?? {});
  return parts.length > 0 && parts.every((p) => p?.result === "ai");
}

/** 리포트가 만들어진 날(report.generatedAt)이 한국 날짜 day(YYYY-MM-DD)인지. 기록이 없으면 false. */
export function generatedOnKstDay(report: unknown, day: string): boolean {
  const at = (report as { generatedAt?: unknown } | null)?.generatedAt;
  if (typeof at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const t = Date.parse(at);
  if (Number.isNaN(t)) return false;
  return new Date(t + 9 * 3600_000).toISOString().slice(0, 10) === day;
}

/** 관리자 화면 날짜 칸 검사: 비었거나 YYYY-MM-DD면 그대로, 아니면 null(잘못된 값) */
export function parseDayParam(v: string | null): string | "" | null {
  if (!v) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}
