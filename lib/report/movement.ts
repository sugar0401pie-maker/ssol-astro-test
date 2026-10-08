// 바람 판정 v3의 화면·문장 보조(순수 함수): 움직임 × 기질 문장(B9), 경계 문장(B10), 2027 '흐름 한눈에' 단계.
import { CHANGE_WISHES, type Q3Wish } from "../astro/answers.ts";
import { clipIntervals, type PeriodResult, type TimelineEvent, type Window } from "../astro/timeline.ts";
import type { MovementLabel, Temperament, WishYear } from "../astro/wish.ts";
import { row, type AstroDb } from "./db.ts";
import { formatMonths } from "./format.ts";

const TEMP_ID: Record<Temperament, string> = { 활동: "CARD", 고정: "FIXED", 변통: "MUT" };

/** B9 행 ID — 표시 없는 해('')는 문장이 없다. */
export function b9Id(movement: MovementLabel, temperament: Temperament, wish: Q3Wish): string | null {
  if (!movement) return null;
  return `MV_${movement === "움직이는 해" ? "MOVE" : "QUIET"}_${TEMP_ID[temperament]}_${CHANGE_WISHES.has(wish) ? "CHG" : "OTH"}`;
}

export function movementLine(db: AstroDb, y: WishYear, temperament: Temperament, wish: Q3Wish): string | null {
  const id = b9Id(y.movementLabel, temperament, wish);
  return id ? row(db, "B9", id)?.line ?? null : null;
}

/** B10 경계 문장(판정 설명 + 위아래를 오가는 해 설명). */
export function edgeLines(db: AstroDb, y: WishYear): { badge: string; line: string; edgeLine: string } | null {
  if (!y.edge) return null;
  const r = row(db, "B10", y.edge);
  return r ? { badge: r.badge, line: r.line, edgeLine: r.edge_line } : null;
}

/**
 * 2027 '흐름 한눈에'(마스터스펙 7장 2, 06 프롬프트 v3): 이벤트를 단계로 묶어 시간순으로 잇는다.
 * 화성 역행 = 정하지 말고 준비, 수성·금성 역행 = 다시 보기, 천왕성 = 제안과 계기, 목성 진입 = 정하고 자리 잡기,
 * 해왕성 = 정리. (단계 이름은 스펙 예시 그대로, 월 표기는 서버 포맷 — Claude가 묶는 규칙, owner 검토 가능)
 * 연말(2026) 역행이 있으면 '2026년 연말 다시 보기'로 맨 앞에 둔다. 단계가 둘 미만이면 빈 목록(한 줄을 만들지 않음).
 */
export function flowSteps(eoy: PeriodResult, y2027: PeriodResult): string[] {
  type Step = { start: string; text: string };
  const steps: Step[] = [];
  if (eoy.all.some((s) => s.event.kind === "retrograde")) steps.push({ start: "2026-12-31", text: "2026년 연말 다시 보기" });
  const w: Window = { start: "2027-01-01", end: "2027-12-31" };
  for (const s of y2027.all) {
    const stage = stageOf(s.event);
    if (!stage) continue;
    const iv = clipIntervals(s.event.intervals, w);
    if (!iv.length) continue;
    const months = stage.from ? `${Number(iv[0].from.slice(5, 7))}월부터` : formatMonths(iv);
    steps.push({ start: iv[0].from, text: `${months} ${stage.text}` });
  }
  steps.sort((a, b) => (a.start < b.start ? -1 : 1));
  // 같은 단계가 이어지면 하나로(앞의 것만)
  const out: string[] = [];
  let lastStage = "";
  for (const s of steps) {
    const st = s.text.replace(/^\S+\s/, "");
    if (st === lastStage) continue;
    lastStage = st;
    out.push(s.text);
  }
  return out.length >= 2 ? out.slice(0, 5) : [];
}

function stageOf(e: TimelineEvent): { text: string; from?: boolean } | null {
  if (e.kind === "retrograde") return e.planet === "mars" ? { text: "정하지 말고 준비" } : { text: "다시 보기" };
  if (e.kind === "transit" && e.transit === "uranus") return { text: "제안과 계기" };
  if (e.kind === "transit" && e.transit === "neptune") return { text: "정리" };
  if (e.kind === "ingress" && e.planet === "jupiter") return { text: "정하고 자리 잡기", from: true };
  return null;
}
