import "server-only";
// 관리자 계정(lib/billing/comp.ts)의 결과는 결제 없이 결제한 것처럼 표시하고 리포트를 만든다.
// 결제 주문(astro_orders)은 만들지 않는다 — 매출·결제 통계에 섞이지 않게. 결과에 paid_at만 남는다.
import { after } from "next/server";
import { isCompEmail } from "@/lib/billing/comp";
import type { Owner } from "./owner";
import { getAccountEmail, isResultPaid, markResultPaid } from "./store";
import { runReportGeneration } from "./report";

/** 관리자 계정이면 결과를 열람 가능으로 바꾸고 리포트 생성을 시작한다. 바꿨으면 true. 실패하면 false(평소대로). */
export async function grantIfComp(owner: Owner, resultId: string): Promise<boolean> {
  if (owner.kind !== "user") return false;
  try {
    if (!isCompEmail(await getAccountEmail(owner.userId))) return false;
    if (!(await isResultPaid(resultId))) await markResultPaid(resultId);
    after(() => runReportGeneration(resultId));
    return true;
  } catch (e) {
    console.error(e instanceof Error ? e.message : "관리자 열람 처리 실패");
    return false;
  }
}
