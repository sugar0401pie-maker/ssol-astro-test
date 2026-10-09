// 유료 리포트 준비(AI 0회): 2026–2031 타임라인 → 기간별 상위 이벤트 → 바람 판정 → DB 뼈대.
// 결제 후 리포트 생성(aiReport.ts)과 결제 전 '두괄식 첫 문장 미리보기'(/api/results/[id]/preview)가 같은 값을 쓴다.
import type { Answers } from "../astro/answers.ts";
import type { BirthResult } from "../astro/birth.ts";
import { buildTimeline, periodWindows, selectPeriods } from "../astro/timeline.ts";
import { computeWish, type WishContext } from "../astro/wish.ts";
import { firstSentence, type AstroDb } from "./db.ts";
import { buildPaidSkeleton } from "./paidSkeleton.ts";

export type Resolved = NonNullable<BirthResult["resolved"]>;

export function prepareSkeleton(args: { db: AstroDb; resolved: Resolved; wishContext: WishContext; answers: Answers; nickname: string; now: Date }) {
  const { db, resolved, answers, nickname, now } = args;
  const { chart, longitudes: L, character } = resolved;
  const windows = periodWindows(now);
  const events = buildTimeline(L, { start: "2026-01-01", end: "2031-12-31" }, windows.eoy, { birthDate: args.wishContext.birthDate });
  const periods = selectPeriods(events, answers.q1, now);
  const wish = computeWish(L, answers.q3, args.wishContext);
  const skeleton = buildPaidSkeleton({ db, chart, longitudes: L, character, answers, events, periods, wish, nickname });
  return { events, periods, wish, skeleton };
}

/** 결제 전 미리보기: 유료 섹션마다 제목 + 두괄식 첫 문장 하나만(디자인가이드 2장 페이월). 본문은 보내지 않는다. */
export function previewLines(skeleton: ReturnType<typeof prepareSkeleton>["skeleton"]): Array<{ no: number; title: string; first: string }> {
  return skeleton.sections.map((s) => ({ no: s.no, title: s.title, first: s.paragraphs[0] ? firstSentence(s.paragraphs[0]) : "" }));
}
