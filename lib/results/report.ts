import "server-only";
// 결제된 결과의 유료 리포트를 만들어 저장한다. 결제 승인 직후(after)와, 리포트를 열었는데 아직 없을 때(재시도) 부른다.
// 생성 자리를 먼저 잡아(claimReportGeneration) 같은 리포트를 동시에 두 번 만들지 않는다.
import { generatePaidReport } from "@/lib/report/aiReport";
import { ASTRO_DB } from "@/lib/report/dbData";
import { wishContextOf } from "@/lib/astro/wish";
import { birthKeyOf } from "@/lib/report/variants";
import { computeFree } from "./compute";
import { chatSummaryFor } from "./chatSummary";
import { claimReportGeneration, getResultForReport, saveChatSummary, saveReport } from "./store";

export async function runReportGeneration(resultId: string): Promise<void> {
  if (!(await claimReportGeneration(resultId))) return; // 이미 만드는 중이거나 끝남
  try {
    const row = await getResultForReport(resultId);
    if (!row) throw new Error("결과 없음");
    const c = computeFree(row.birth_input, row.answers, row.nickname);
    if (c.kind !== "result") throw new Error("결과를 다시 계산하지 못함");
    const report = await generatePaidReport({ db: ASTRO_DB, resolved: c.birth.resolved, wishContext: wishContextOf(c.birth.stored, c.birth.accuracy), answers: row.answers, nickname: row.nickname, birthKey: birthKeyOf(row.birth_input) });
    await saveReport(resultId, report);
    // 쏘웰라 채팅이 참고할 요약을 리포트 본문·제안까지 넣어 다시 만든다.
    await saveChatSummary(resultId, chatSummaryFor(c, row.answers, report));
  } catch (e) {
    console.error("유료 리포트 생성 실패:", e instanceof Error ? e.message : "unknown");
    await saveReport(resultId, null).catch(() => {});
  }
}
