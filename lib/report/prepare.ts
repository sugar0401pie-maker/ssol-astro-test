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
 * 결제 전 미리보기(패키지 v3 웹툰식 결과, 2026-10-10): 4~7장마다 굵은 요약 + 본문 첫 두 문장만.
 * 나머지 본문·소제목·표·근거는 보내지 않는다(블러만으로 가리면 결제 없이 볼 수 있으므로) — 흐린 자리는 B13 가짜 문장.
 */
export function previewLines(skeleton: ReturnType<typeof prepareSkeleton>["skeleton"]): Array<{ no: number; title: string; first: string; lines: string[] }> {
  return skeleton.sections.map((s) => {
    // 프로토타입 lockTeasers: 소제목(• …)은 건너뛰고 문단에서 문장 두 개
    const paras = [...s.body, ...s.tail].filter((b) => b.t !== "head" && b.t !== "sub").map(blockText).filter(Boolean);
    const sentences = paras.join(" ").match(/[^.!?]+[.!?]+[”’"]?/g) ?? [];
    return { no: s.no, title: s.title, first: s.summary ?? "", lines: sentences.slice(0, PREVIEW_LINES).map((x) => x.trim()) };
  });
}

/**
 * 블러 자리를 채울 가짜 문단(해석 DB B13): 결제 전에는 실제 유료 본문을 보내지 않으므로, 첫 두 문장 아래 흐려지는 자리를
 * 샘플 리포트에서 날짜·이름을 지운 문장으로 채운다. 프로토타입처럼 섹션 문장을 두 번 이어 앞에서 max개.
 */
export function blurParagraphs(db: AstroDb, section: number, nickname: string, max = 7): string[] {
  const rows = (db.dbs.B13?.rows ?? []).filter((r) => String(r.section) === String(section)).sort((a, b) => a.id.localeCompare(b.id));
  const texts = rows.map((r) => r.text.replaceAll("{닉네임}", nickname));
  return [...texts, ...texts].slice(0, max);
}
