import "server-only";
// 쏘웰라 채팅용 요약 만들기(서버). 결과 저장 때 한 번(무료 내용), 리포트가 만들어지면 한 번 더(리포트 본문·제안 포함).
// 실패해도 결과 저장·리포트에는 영향을 주지 않는다(채팅 참고는 부가 기능 — null이면 쏘웰라가 그냥 안 씀).
import type { Answers } from "@/lib/astro/answers";
import { computeWish, wishContextOf } from "@/lib/astro/wish";
import type { PaidReport } from "@/lib/report/aiReport";
import { buildChatSummary } from "@/lib/report/chatSummary";
import { ASTRO_DB } from "@/lib/report/dbData";
import type { Computed } from "./compute";

export function chatSummaryFor(computed: Extract<Computed, { kind: "result" }>, answers: Answers, paid?: PaidReport | null): string | null {
  try {
    const b = computed.birth;
    const wish = computeWish(b.resolved.longitudes, answers.q3, wishContextOf(b.stored, b.accuracy));
    return buildChatSummary({ db: ASTRO_DB, free: computed.result, answers, wish, paid: paid ?? null });
  } catch (e) {
    console.warn("채팅 요약 만들기 실패:", e instanceof Error ? e.name : "unknown");
    return null;
  }
}
