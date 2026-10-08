// 이벤트 점수·기간 선택·바람 판정. 가중치는 임시 초안이라 '정확한 점수'보다 규칙(관련도 가산, 결정성,
// C등급 하우스 제외, 스펙 샘플과 같은 근거가 잡히는지)을 고정한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeNatal } from "./natal.ts";
import {
  buildTimeline, groupRows, mergeRuns, scoreInWindow, selectPeriods, touchesDomain, turningPoints, type TimelineEvent,
} from "./timeline.ts";
import { computeWish, levelOf } from "./wish.ts";
import { DOMAIN_BOOST } from "./scoringConfig.ts";

const { L } = computeNatal(new Date(Date.UTC(1996, 3, 1, 1, 17)), 37.2893, 127.0535);
const NOW = new Date("2026-10-07T03:00:00Z");
const events = buildTimeline(L, { start: "2026-01-01", end: "2031-12-31" }, { start: "2026-10-07", end: "2026-12-31" });

test("역행으로 같은 각도를 여러 번 지나면 한 이벤트로 묶는다", () => {
  const g = mergeRuns(
    [
      { from: "2026-01-01", to: "2026-01-20", exact: "2026-01-10", orb: 0 },
      { from: "2026-06-01", to: "2026-06-20", exact: "2026-06-10", orb: 0 },
      { from: "2028-03-01", to: "2028-03-20", exact: "2028-03-10", orb: 0 },
    ],
    400,
  );
  assert.equal(g.length, 2);
  assert.equal(g[0].length, 2);
});

test("샘플: 2026 전환점에 토성 리턴(2/7)·천왕성 쌍둥이자리 진입(4/26, 1하우스)이 잡힌다(디자인가이드 6장 예시)", () => {
  const tp = turningPoints(events, { start: "2026-01-01", end: "2026-12-31" });
  const sr = tp.find((e) => e.kind === "transit" && e.milestone === "saturn_return");
  assert.equal(sr?.intervals[0].exact, "2026-02-07");
  const ur = tp.find((e) => e.kind === "ingress" && e.planet === "uranus");
  assert.ok(ur && ur.kind === "ingress");
  assert.equal(ur.intervals[0].from, "2026-04-26");
  assert.equal(ur.sign, "쌍둥이자리");
  assert.equal(ur.house, 1);
});

test("샘플: 연말 파트에 수성 역행(6H, 10/25~11/14)이 들어간다(마스터스펙 7-2 예시와 같음)", () => {
  const p = selectPeriods(events, "직업·커리어", NOW);
  assert.deepEqual(p.eoy.window, { start: "2026-10-07", end: "2026-12-31" });
  const merc = p.eoy.all.find((s) => s.event.kind === "retrograde" && s.event.planet === "mercury");
  assert.ok(merc && merc.event.kind === "retrograde");
  assert.equal(merc.event.house, 6);
  assert.deepEqual(merc.intervalsInWindow, [{ from: "2026-10-25", to: "2026-11-14" }]);
});

test("Q1 관련 이벤트는 ×1.5, 같은 입력이면 항상 같은 순서", () => {
  const w = { start: "2027-01-01", end: "2027-12-31" };
  const career = scoreInWindow(events, w, "직업·커리어");
  const love = scoreInWindow(events, w, "연애");
  const pick = (arr: typeof career, id: string) => arr.find((s) => s.event.id === id)!;
  const sat = career.find((s) => s.event.kind === "transit" && s.event.transit === "saturn")!;
  // 토성 트랜짓은 커리어 영역(토성)이라 가산, 연애에서는 하우스가 맞지 않으면 가산 없음
  assert.equal(sat.domainRelevant, true);
  const l = pick(love, sat.event.id);
  if (!l.domainRelevant) assert.ok(Math.abs(sat.score - l.score * DOMAIN_BOOST) < 0.02);
  assert.deepEqual(scoreInWindow(events, w, "연애").map((s) => s.event.id), love.map((s) => s.event.id));
});

test("touchesDomain: 하우스가 없는 C등급 이벤트는 행성으로만 판정한다", () => {
  const e: TimelineEvent = { id: "x", kind: "retrograde", planet: "venus", sign: "전갈자리", house: null, intervals: [{ from: "2026-10-03", to: "2026-11-13" }] };
  assert.equal(touchesDomain(e, "연애"), true);
  assert.equal(touchesDomain(e, "가족"), false);
});

test("groupRows: 연말은 월, 2027은 분기, 5년은 연 단위 행", () => {
  const p = selectPeriods(events, "가족", NOW);
  assert.deepEqual(groupRows(p.eoy.all, p.eoy.window, "month").map((r) => r.index), [10, 11, 12]);
  assert.deepEqual(groupRows(p.year2027.all, p.year2027.window, "quarter").map((r) => r.index), [1, 2, 3, 4]);
  assert.deepEqual(groupRows(p.fiveYears.all, p.fiveYears.window, "year").map((r) => r.index), [2027, 2028, 2029, 2030, 2031]);
});

test("바람 판정 v3: 샘플의 2028년 근거(목성 4하우스 통과, 토성–달 삼분 6·11월)", () => {
  const w = computeWish(L, "안정", { birthDate: "1996-04-01", dayChart: true });
  assert.equal(w.years.length, 5);
  const y2028 = w.years.find((y) => y.year === 2028)!;
  assert.equal(y2028.level, "순풍");
  assert.ok(y2028.reasons.some((r) => r.kind === "house" && r.transit === "jupiter" && r.house === 4));
  assert.ok(y2028.reasons.some((r) => r.kind === "aspect" && r.transit === "saturn" && r.target === "moon" && r.aspect === "삼분"));
  assert.equal(w.firstOpenYear, 2028);
  assert.equal(w.closestYear, null);
  assert.equal(levelOf(0), "보통");
});

test("바람 판정 v3: C등급은 하우스·지배 행성·축을 빼고 주제 행성과 달만 본다", () => {
  const c = computeNatal(new Date(Date.UTC(1996, 3, 1, 3, 0)), 37.2893, 127.0535, false);
  const w = computeWish(c.L, "나다움", { birthDate: "1996-04-01", dayChart: null });
  assert.equal(w.housesExcluded, true);
  assert.deepEqual(Object.keys(w.significators).sort(), ["moon", "sun"]);
  assert.ok(w.years.every((y) => y.factors.every((r) => r.kind === "aspect") && y.profectionLord === null));
});
