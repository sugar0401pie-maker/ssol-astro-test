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
export function previewLines(
  skeleton: ReturnType<typeof prepareSkeleton>["skeleton"],
): Array<{ no: number; title: string; first: string; lines: string[]; parts: Array<{ head?: string; text?: string }> }> {
  return skeleton.sections.map((s) => {
    const sentences = sectionParagraphs(s).join(" ").match(/[^.!?]+[.!?]+/g) ?? [];
    // 프로토타입 잠긴 화면(.locked .lp): 소제목은 그대로, 문단·목록은 앞 2줄 남짓만 보이고 흐려진다 — 앞부분 글자만 보낸다(본문 전체는 보내지 않음).
    const parts: Array<{ head?: string; text?: string }> = [];
    for (const b of [...s.body, ...s.tail]) {
      if (parts.length >= PREVIEW_PARTS) break;
      if (b.t === "head" || b.t === "sub") parts.push({ head: b.text });
      else {
        const t = blockText(b);
        if (t) parts.push({ text: t.length > PREVIEW_CHARS ? t.slice(0, PREVIEW_CHARS) : t });
      }
    }
    // 2026-10-10 owner: 유료 경계(9-4)와 연말 섹션(9-5)을 한 화면으로 — 4번 섹션은 본문 앞 2줄(첫 조각)만 실제 문장,
    // 그 아래는 전부 흐린 가짜 문장(B13)으로 채운다. 그래서 첫 조각 뒤의 실제 소제목·문장은 보내지 않는다.
    const shown = s.no === 4 ? parts.filter((p) => p.text).slice(0, 1) : parts;
    return { no: s.no, title: s.title, first: s.summary ?? "", lines: sentences.slice(0, PREVIEW_LINES).map((x) => x.trim()), parts: shown };
  });
}

/** 잠긴 섹션 미리보기: 조각 수와 조각마다 보내는 글자 수(2.7줄 남짓 — 화면에서 흐려지는 만큼만) */
const PREVIEW_PARTS = 6;
const PREVIEW_CHARS = 70;

/**
 * 블러 영역을 채울 가짜 문장(해석 DB B13, 2026-10-10 패키지): 결제 전에는 실제 유료 본문을 보내지 않으므로,
 * 각 부분의 앞 2줄(실제) 아래 흐려지는 자리를 샘플 리포트에서 날짜·이름을 지운 문장으로 채운다.
 * 같은 섹션 문장을 순서대로 이어 붙이고, 모자라면 처음부터 반복한다(minChars까지).
 */
export function blurFiller(db: AstroDb, section: number, nickname: string, minChars = 160): string {
  const rows = (db.dbs.B13?.rows ?? []).filter((r) => String(r.section) === String(section)).sort((a, b) => a.id.localeCompare(b.id));
  if (!rows.length) return "";
  const texts = rows.map((r) => r.text.replaceAll("{닉네임}", nickname));
  let out = "";
  for (let i = 0; out.length < minChars; i++) out += (out ? " " : "") + texts[i % texts.length];
  return out;
}
