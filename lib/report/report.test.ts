import { test } from "node:test";
import assert from "node:assert/strict";
import { batchim, formatMonths, formatRange, formatRanges, josa } from "./format.ts";
import { endingClass, substituteTokens, validateReport } from "./validate.ts";
import { buildReportInput, tokenValues } from "./reportInput.ts";
import { computeNatal } from "../astro/natal.ts";
import { judgeCharacter, type CalibrationTable } from "../astro/character.ts";
import { buildTimeline, selectPeriods } from "../astro/timeline.ts";
import { computeWish } from "../astro/wish.ts";
import { readFileSync } from "node:fs";

test("날짜 구간 포맷(마스터스펙 7-1 예시)", () => {
  assert.equal(formatRange("2026-11-03", "2026-11-24"), "11월 3일~24일");
  assert.equal(formatRange("2026-11-03", "2026-12-05"), "11월 3일~12월 5일");
  assert.equal(formatRange("2026-12-10", "2027-02-03"), "2026년 12월~2027년 2월");
  assert.equal(formatRange("2026-04-26", "2026-04-26"), "4월 26일");
  assert.equal(formatRange("2029-03-01", "2029-04-02", true), "2029년 3월 1일~4월 2일");
  assert.equal(formatRanges([{ from: "2026-05-05", to: "2026-06-19" }, { from: "2026-09-03", to: "2026-10-27" }]), "5월 5일~6월 19일, 9월 3일~10월 27일");
  assert.equal(formatMonths([{ from: "2028-06-01", to: "2028-06-27" }, { from: "2028-11-01", to: "2028-12-18" }]), "6·11월");
});

test("조사: 받침·ㄹ받침·숫자·영문", () => {
  assert.equal(josa("수달", "이/가"), "수달이");
  assert.equal(josa("해파리", "이/가"), "해파리가");
  assert.equal(josa("물개", "은/는"), "물개는");
  assert.equal(josa("거북", "와/과"), "거북과");
  assert.equal(josa("비버", "와/과"), "비버와");
  assert.equal(josa("물", "으로/로"), "물로");
  assert.equal(josa("불가사리", "으로/로"), "불가사리로");
  assert.equal(josa("백조", "이에요/예요"), "백조예요");
  assert.equal(josa("2028년", "은/는"), "2028년은");
  assert.equal(josa("Mina", "이/가"), "Mina이(가)");
  assert.equal(batchim("3")?.has, true); // 삼
});

const base = {
  allowedTokens: ["E1_기간", "열리는해"],
  allowedNames: ["토성", "태양", "목성", "양자리"],
  allowedHouses: [4, 11],
};

test("검증: 토큰 밖 숫자·모르는 토큰·빠진 토큰을 잡는다", () => {
  assert.deepEqual(validateReport("{{E1_기간}}에 토성이 태양 위를 지나요. 목성이 내 4하우스를 지나는 때입니다.", base), []);
  assert.ok(validateReport("11월에 조심해요.", base).some((i) => i.code === "digit_outside_token"));
  assert.ok(validateReport("목성이 7하우스를 지나요.", base).some((i) => i.code === "digit_outside_token"));
  assert.ok(validateReport("{{E9_기간}}이에요.", base).some((i) => i.code === "unknown_token"));
  assert.ok(validateReport("조용한 때예요.", { ...base, requiredTokens: ["열리는해"] }).some((i) => i.code === "missing_token"));
});

test("검증: 입력에 없는 행성·별자리, '한 달'은 달로 보지 않음", () => {
  assert.ok(validateReport("명왕성이 움직여요.", base).some((i) => i.detail === "명왕성"));
  assert.ok(validateReport("전갈자리의 기운이에요.", base).some((i) => i.detail === "전갈자리"));
  assert.deepEqual(validateReport("한 달 동안 천천히 해봐요. 마음이 달라질 수 있습니다.", base), []);
  assert.ok(validateReport("달이 흔들리는 때예요.", base).some((i) => i.detail === "달"));
});

test("검증: 단정·금지 영역·이론명·** ·역풍 포장", () => {
  const codes = (t: string, o = {}) => validateReport(t, { ...base, ...o }).map((i) => i.code);
  assert.ok(codes("반드시 좋아집니다.").includes("banned_phrase"));
  assert.ok(codes("주식을 사기 좋은 때예요.").includes("banned_phrase"));
  assert.ok(codes("ACT에서는 가치를 봐요.").includes("theory_name"));
  assert.ok(codes("수용전념의 방법이에요.").includes("theory_name"));
  assert.ok(!codes("벡터처럼 방향을 정해요.").includes("theory_name"));
  assert.ok(codes("**중요**해요.").includes("markdown_bold"));
  assert.ok(codes("순조로운 해예요.", { headwind2027: true }).includes("headwind_sugarcoat"));
  assert.ok(!codes("순조로운 해예요.").includes("headwind_sugarcoat"));
});

test("검증: 어미 3연속·한쪽 65% 초과", () => {
  assert.equal(endingClass("좋은 때입니다."), "formal");
  assert.equal(endingClass("좋은 때예요."), "polite");
  const run = "하나예요. 둘이에요. 셋이에요. 넷입니다.";
  assert.ok(validateReport(run, base).some((i) => i.code === "ending_run"));
  const ok = "하나예요. 둘입니다. 셋이에요. 넷입니다. 다섯이에요. 여섯입니다.";
  assert.deepEqual(validateReport(ok, base), []);
});

test("토큰 치환: 모르는 토큰이면 예외", () => {
  assert.equal(substituteTokens("{{E1_기간}}에", { E1_기간: "11월 3일~24일" }), "11월 3일~24일에");
  assert.throws(() => substituteTokens("{{X}}", {}));
});

test("리포트 입력 조립: 날짜는 토큰으로만, 판정·근거는 서버 값 그대로", () => {
  const ref: CalibrationTable = JSON.parse(readFileSync(new URL("../../data/astro/calibration.json", import.meta.url), "utf8"));
  const { chart, L } = computeNatal(new Date(Date.UTC(1996, 3, 1, 1, 17)), 37.2893, 127.0535);
  const character = judgeCharacter(L, chart.elements, ref);
  const answers = { q1: "직업·커리어", q2: "변화", q3: "안정" } as const;
  const events = buildTimeline(L, { start: "2026-01-01", end: "2031-12-31" }, { start: "2026-10-07", end: "2026-12-31" });
  const periods = selectPeriods(events, answers.q1, new Date("2026-10-07T03:00:00Z"));
  const wish = computeWish(L, answers.q3, { birthDate: "1996-04-01", dayChart: true });
  const built = buildReportInput({ nickname: "지우", chart, character, answers, periods, wish, typeLine: "누군가에게 기대는 일에 에너지가 많이 들고, 그럴 때 먼저 다가가는 유형" });
  const json = JSON.stringify(built.input);
  // 입력 본문에 날짜(YYYY-MM-DD)가 직접 들어가지 않는다 — 전부 토큰.
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(json));
  assert.equal(built.input.chart.sun, "양자리/11H");
  assert.equal(built.input.character.name, "누군가에게 기대는 일에 에너지가 많이 들고, 그럴 때 먼저 다가가는 유형"); // 동물 이름은 AI에 주지 않는다
  assert.equal(built.input.soft_tone, false);
  assert.ok(built.input.events_eoy.length > 0 && built.input.events_eoy.every((e) => built.tokens[e.token]));
  if (wish.firstOpenYear) assert.equal(tokenValues(built.tokens)["열리는해"], `${wish.firstOpenYear}년`);
  assert.ok(built.allowedNames.includes("양자리") && built.allowedNames.includes("토성"));
  assert.ok(built.allowedHouses.includes(11));
  const soft = buildReportInput({ nickname: "지우", chart, character, answers: { ...answers, q2: "그만하자" }, periods, wish, typeLine: "누군가에게 기대는 일에 에너지가 많이 들고, 그럴 때 먼저 다가가는 유형" });
  assert.equal(soft.input.soft_tone, true);
});

