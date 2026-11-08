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
