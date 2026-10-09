// 유료 리포트 준비(AI 0회): 2026–2031 타임라인 → 기간별 상위 이벤트 → 바람 판정 → DB 뼈대.
// 결제 후 리포트 생성(aiReport.ts)과 결제 전 미리보기(/api/results/[id]/preview)가 같은 값을 쓴다.
import type { Answers } from "../astro/answers.ts";
import type { BirthResult } from "../astro/birth.ts";
import { buildTimeline, periodWindows, selectPeriods } from "../astro/timeline.ts";
import { computeWish, type WishContext } from "../astro/wish.ts";
import type { AstroDb } from "./db.ts";
import { buildPaidSkeleton, blockText, type PaidSection } from "./paidSkeleton.ts";

export type Resolved = NonNullable<BirthResult["resolved"]>;

export function prepareSkeleton(args: { db: AstroDb; resolved: Resolved; wishContext: WishContext; answers: Answers; nickname: string; now: Date; birthKey?: string }) {
  const { db, resolved, answers, nickname, now } = args;
  const { chart, longitudes: L, character } = resolved;
  const windows = periodWindows(now);
  const events = buildTimeline(L, { start: "2026-01-01", end: "2031-12-31" }, windows.eoy, { birthDate: args.wishContext.birthDate });
  const periods = selectPeriods(events, answers.q1, now);
  const wish = computeWish(L, answers.q3, args.wishContext);
  const skeleton = buildPaidSkeleton({ db, chart, longitudes: L, character, answers, events, periods, wish, nickname, birthKey: args.birthKey });
  return { events, periods, wish, skeleton };
}

/** 미리보기 한 부분에 보내는 줄 수(마스터스펙 6 '각 부분은 앞 2줄 정도만 보인 뒤 흐려진다') */
export const PREVIEW_LINES = 2;

/** 섹션 본문을 글자 문단으로(채팅 요약·미리보기) */
export function sectionParagraphs(s: Pick<PaidSection, "body" | "tail">): string[] {
  return [...s.body, ...s.tail].map(blockText).filter(Boolean);
}

/**
 * 결제 전 미리보기(2026-10-09 페이월): 유료 섹션마다 제목 + 굵은 요약 + 본문 앞부분 문장 두 개만.
 * 나머지 본문·표·근거는 보내지 않는다(블러만으로 가리면 결제 없이 볼 수 있으므로).
 */
export function previewLines(skeleton: ReturnType<typeof prepareSkeleton>["skeleton"]): Array<{ no: number; title: string; first: string; lines: string[] }> {
  return skeleton.sections.map((s) => {
    const sentences = sectionParagraphs(s).join(" ").match(/[^.!?]+[.!?]+/g) ?? [];
    return { no: s.no, title: s.title, first: s.summary ?? "", lines: sentences.slice(0, PREVIEW_LINES).map((x) => x.trim()) };
  });
}
