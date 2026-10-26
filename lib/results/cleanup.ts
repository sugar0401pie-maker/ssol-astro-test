import "server-only";
// 기한 지난 데이터 정리(비회원 결과 30일, 저장 IP 기록 7일 — 개인정보처리방침 5항).
// owner 2026-10-26: CRON_SECRET을 넣지 않기로 해 하루 한 번 정리 작업(/api/cron/cleanup)이 돌지 않는다 →
// 결과 저장·목록 요청이 응답을 보낸 뒤(after) 이 정리를 대신 돌린다. 한 서버 인스턴스에서 1시간에 한 번까지만.
// 지우는 대상은 이미 기한이 지난 줄뿐이라 누가 몇 번 불러도 안전하다.
import { deleteExpiredGuestResults } from "./store";
import { deleteOldIpSaves } from "./ipLog";

const EVERY_MS = 60 * 60_000;
let lastRun = 0;

export async function runCleanup(): Promise<{ deleted: number; ipLogDeleted: number }> {
  const deleted = await deleteExpiredGuestResults();
  const ipLogDeleted = await deleteOldIpSaves().catch((e) => {
    console.error(e instanceof Error ? e.message : "IP 기록 정리 실패");
    return 0;
  });
  return { deleted, ipLogDeleted };
}

/** 마지막 정리 후 1시간이 지났으면 정리한다(실패해도 조용히 — 다음 요청에서 다시). */
export async function maybeCleanup(now = Date.now()): Promise<void> {
  if (now - lastRun < EVERY_MS) return;
  lastRun = now;
  try {
    await runCleanup();
  } catch (e) {
    console.error(e instanceof Error ? e.message : "정리 실패");
  }
}
