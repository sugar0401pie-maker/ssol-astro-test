// 무료 구간(1~3번 섹션) 화면 데이터 조립 — AI 호출 0회(마스터스펙 6-2). 해석 문장은 owner가 준비 중인
// DB(05_DB목록 A1~A18)가 오면 채우고, 지금은 엔진이 정한 구조(전환점·분기별 이벤트·근거 한 줄 재료)만 만든다.
// 유료 섹션(4~7)은 제목만 보낸다 — 본문을 브라우저에 보내고 블러로 가리면 결제 없이 볼 수 있기 때문.
import { isSoftTone, type Answers } from "../astro/answers.ts";
import type { CharacterResult } from "../astro/character.ts";
import type { Accuracy, Longitudes, NatalChart } from "../astro/natal.ts";
import { buildTimeline, groupRows, scoreInWindow, periodFilter, turningPoints, type TimelineEvent } from "../astro/timeline.ts";
import { formatDate, formatRanges, QUARTER_LABELS } from "./format.ts";
import { eventLabel } from "./labels.ts";

export const PAID_SECTION_TITLES = [
  { no: 4, title: "연말까지 조심하면 좋을 것" },
  { no: 5, title: "2027년을 맞는 마음가짐" },
  { no: 6, title: "앞으로 5년, {닉네임}님의 삶은 이렇게 흘러갈 거예요" },
  { no: 7, title: "별이 주는 질문과 웰니스 제안" },
] as const;

export const DISCLAIMER =
  "점성술은 과학적으로 검증된 예측 도구가 아니며, 이 결과는 자기 성찰을 위한 웰니스 콘텐츠입니다. 중요한 결정은 현실의 정보와 전문가의 도움을 함께 살펴주세요.";

export const ACCURACY_NOTE: Record<Accuracy, string> = {
  A: "태어난 시간까지 반영해 상승궁과 하우스를 모두 계산했어요.",
  B: "고른 시간대 안에서 계산했어요. 정확한 시간을 알면 상승궁과 하우스가 더 정확해져요.",
  C: "태어난 시간을 몰라 상승궁과 하우스는 빼고, 행성과 별자리 중심으로 계산했어요. 태어난 시간을 알면 더 정확해져요.",
};

export interface FreeResult {
  accuracy: Accuracy;
  chart: NatalChart;
  character: Pick<CharacterResult, "name" | "competency" | "style" | "needs_confirm" | "runner_up">;
  sunSign: string;
  softTone: boolean;
  year2026: {
    turningPoints: Array<{ date: string; label: string }>;
    quarters: Array<{ label: string; items: Array<{ label: string; when: string }> }>;
  };
  paidSections: typeof PAID_SECTION_TITLES;
}

function when(e: TimelineEvent): string {
  return e.intervals[0].exact ?? e.intervals[0].from;
}

export function buildFreeResult(args: { chart: NatalChart; longitudes: Longitudes; character: CharacterResult; answers: Answers }): FreeResult {
  const { chart, longitudes, character, answers } = args;
  const w = { start: "2026-01-01", end: "2026-12-31" };
  const events = buildTimeline(longitudes, w);
  const tps = turningPoints(events, w);
  const tpIds = new Set(tps.map((e) => e.id));
  // 분기별 표: 특정 날짜 전환점은 표가 아니라 본문 문단으로(디자인가이드 6장) — 표에서는 뺀다.
  const scored = scoreInWindow(events.filter((e) => periodFilter("year2026", e) && !tpIds.has(e.id)), w, answers.q1);
  const rows = groupRows(scored, w, "quarter");
  return {
    accuracy: chart.accuracy,
    chart,
    character: {
      name: character.name,
      competency: character.competency,
      style: character.style,
      needs_confirm: character.needs_confirm,
      runner_up: character.runner_up,
    },
    sunSign: chart.planets.sun!.sign,
    softTone: isSoftTone(answers.q2),
    year2026: {
      turningPoints: tps.map((e) => ({ date: formatDate(when(e)), label: eventLabel(e) })),
      quarters: rows.map((r) => ({
        label: QUARTER_LABELS[r.index - 1],
        // 분기마다 점수 상위 3개만(행이 길어지지 않게)
        items: r.events.slice(0, 3).map((s) => ({ label: eventLabel(s.event), when: formatRanges(s.intervalsInWindow) })),
      })),
    },
    paidSections: PAID_SECTION_TITLES,
  };
}
