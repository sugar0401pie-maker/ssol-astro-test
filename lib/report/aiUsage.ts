import "server-only";
// AI 호출마다 실제 토큰 수를 astro_ai_usage에 한 줄씩(owner 2026-11-23). 기록 실패는 리포트 생성을 막지 않는다(경고만).
import { createAdminClient } from "@/lib/supabase/admin";
import { usageRow, type UsageContext, type UsageNumbers } from "./aiUsageRow";

export type { UsageContext } from "./aiUsageRow";

export async function recordAiUsage(ctx: UsageContext, part: string, n: UsageNumbers): Promise<void> {
  try {
    const { error } = await createAdminClient().from("astro_ai_usage").insert(usageRow(ctx, part, n));
    if (error) console.warn("AI 사용량 기록 실패:", error.code ?? error.message);
  } catch (e) {
    console.warn("AI 사용량 기록 실패:", e instanceof Error ? e.name : "unknown");
  }
}
