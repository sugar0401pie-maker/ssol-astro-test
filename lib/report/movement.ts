// 바람 판정 v3의 화면·문장 보조(순수 함수): 움직임 × 기질 문장(B9), 경계 문장(B10), 2027 '흐름 한눈에' 단계.
import { CHANGE_WISHES, type Q3Wish } from "../astro/answers.ts";
import { clipIntervals, type PeriodResult, type TimelineEvent, type Window } from "../astro/timeline.ts";
import type { MovementLabel, Temperament, WishYear } from "../astro/wish.ts";
import { row, type AstroDb } from "./db.ts";

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
 * 2027 '흐름 한눈에'(마스터스펙 7장 2, 06 프롬프트 v3): 그해 이벤트를 단계로 묶어 시간순으로 잇는다.
 * 화성 역행 = 정하지 말고 준비, 천왕성(개인 지점에 닿음) = 제안과 계기, 목성 별자리 이동 = 정하고 자리 잡기,
 * 해왕성 = 정리. 2027 파트 본문은 목성·토성만 보지만, 이 한 줄은 스펙 예시대로 외행성까지 본다(전체 이벤트에서 고름).
 * 연말(2026) 역행이 있으면 '2026년 연말 다시 보기'로 맨 앞에 둔다. 같은 단계는 달을 모아 한 칸("4·6월 제안과 계기").
 * 단계가 둘 미만이면 빈 목록(한 줄을 만들지 않음). (단계 이름은 스펙 예시 그대로 — 묶는 규칙은 Claude, owner 검토 가능)
 */
export function flowSteps(events: TimelineEvent[], eoy: PeriodResult): string[] {
  const w: Window = { start: "2027-01-01", end: "2027-12-31" };
  const month = (d: string) => Number(d.slice(5, 7));
  const groups = new Map<string, { start: string; kind: StageKind; months: number[]; range: [number, number] }>();
  for (const e of events) {
    const stage = stageOf(e);
    if (!stage) continue;
    const iv = clipIntervals(e.intervals, w);
    if (!iv.length) continue;
    // 외행성은 정확한 날짜가 2027년 안에 있는 첫 통과 하나만(역행으로 다시 지나는 것은 같은 사건 — 바람 판정과 같은 규칙)
    const exact = iv.find((x) => x.exact)?.exact;
    if (stage.kind === "exact" && !exact) continue;
    const start = stage.kind === "exact" ? exact! : iv[0].from;
    const g = groups.get(stage.text) ?? { start, kind: stage.kind, months: [], range: [month(iv[0].from), month(iv[iv.length - 1].to)] as [number, number] };
    if (start < g.start) g.start = start;
    if (stage.kind === "exact") g.months.push(month(exact!));
    groups.set(stage.text, g);
  }
  const when = (g: { start: string; kind: StageKind; months: number[]; range: [number, number] }) => {
    if (g.kind === "from") return `${month(g.start)}월부터`;
    if (g.kind === "range") return g.range[0] === g.range[1] ? `${g.range[0]}월` : `${g.range[0]}~${g.range[1]}월`;
    return `${[...new Set(g.months)].sort((x, y) => x - y).join("·")}월`;
  };
  const steps = [...groups.entries()].sort((a, b) => (a[1].start < b[1].start ? -1 : 1)).map(([text, g]) => `${when(g)} ${text}`);
  if (eoy.all.some((s) => s.event.kind === "retrograde")) steps.unshift("2026년 연말 다시 보기");
  return steps.length >= 2 ? steps.slice(0, 5) : [];
}

type StageKind = "range" | "from" | "exact";
const PERSONAL = new Set(["sun", "moon", "mercury", "venus", "mars", "asc", "mc"]);
const HARD = new Set(["합", "사각", "충"]);

/** 화성 역행 = 걸친 달 범위, 목성 진입 = 그 달부터, 천왕성·해왕성 = 개인 지점에 닿는 합·사각·충의 정확한 달. */
function stageOf(e: TimelineEvent): { text: string; kind: StageKind } | null {
  if (e.kind === "retrograde" && e.planet === "mars") return { text: "정하지 말고 준비", kind: "range" };
  if (e.kind === "ingress" && e.planet === "jupiter") return { text: "정하고 자리 잡기", kind: "from" };
  if (e.kind === "transit" && PERSONAL.has(e.target) && HARD.has(e.aspect)) {
    if (e.transit === "uranus") return { text: "제안과 계기", kind: "exact" };
    if (e.transit === "neptune") return { text: "정리", kind: "exact" };
  }
  return null;
}
