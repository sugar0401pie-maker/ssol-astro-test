// 유료 리포트: DB 뼈대(AI 실패 시 그대로 나가는 본문)와 AI 출력 처리(검증 → 토큰 치환 → 섹션 나누기).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeNatal } from "../astro/natal.ts";
import { judgeCharacter, type CalibrationTable } from "../astro/character.ts";
import { buildTimeline, periodWindows, selectPeriods } from "../astro/timeline.ts";
import { computeWish } from "../astro/wish.ts";
import type { Answers } from "../astro/answers.ts";
import { row, type AstroDb } from "./db.ts";
import { buildPaidSkeleton, evidencePhrase } from "./paidSkeleton.ts";
import { buildReportInput } from "./reportInput.ts";
import { previewLines } from "./prepare.ts";
import { fillSystemPrompt, partUserMessage, processPartOutput, splitSections } from "./aiPrompt.ts";
import { SYSTEM_PROMPT_TEMPLATE } from "./systemPrompt.ts";
import { compileC1, type C1Row } from "./validate.ts";

const db: AstroDb = JSON.parse(readFileSync(new URL("../../data/astro/db/astro_db_v1.2.json", import.meta.url), "utf8"));
const ref: CalibrationTable = JSON.parse(readFileSync(new URL("../../data/astro/calibration.json", import.meta.url), "utf8"));
const c1 = compileC1(db.dbs.C1.rows as unknown as C1Row[]);
const NOW = new Date("2026-10-07T03:00:00Z");

function setup(answers: Answers = { q1: "직업·커리어", q2: "변화", q3: "안정" }) {
  const { chart, L } = computeNatal(new Date(Date.UTC(1996, 3, 1, 1, 17)), 37.2893, 127.0535);
  const character = judgeCharacter(L, chart.elements, ref);
  const events = buildTimeline(L, { start: "2026-01-01", end: "2031-12-31" }, periodWindows(NOW).eoy);
  const periods = selectPeriods(events, answers.q1, NOW);
  const wish = computeWish(L, answers.q3, { birthDate: "1996-04-01", dayChart: true });
  const skeleton = buildPaidSkeleton({ db, chart, longitudes: L, character, answers, events, periods, wish, nickname: "지우" });
  const flow = skeleton.sections.find((s) => s.no === 5)?.flow ?? [];
  const built = buildReportInput({ nickname: "지우", chart, character, answers, periods, wish, typeLine: "누군가에게 기대는 일에 에너지가 많이 들고, 그럴 때 먼저 다가가는 유형", flow });
  return { skeleton, built, wish };
}

test("시스템 프롬프트가 스펙 06 문서의 '시스템 프롬프트 전문'과 같다(손으로 고치지 않기)", () => {
  const md = readFileSync(new URL("../../docs/spec/06_리포트프롬프트_점성술.md", import.meta.url), "utf8");
  const i = md.indexOf("## 시스템 프롬프트 전문");
  assert.equal(SYSTEM_PROMPT_TEMPLATE, md.slice(md.indexOf("\n", i) + 1).trim());
});

test("DB 뼈대: 4섹션 모두 있고, 연말 본문에 금성 역행(6H)·표 11월에 수성 역행(6H), 질문·실천은 DB 그대로", () => {
  const { skeleton } = setup();
  assert.deepEqual(skeleton.sections.map((s) => s.no), [4, 5, 6, 7]);
  const s4 = skeleton.sections[0];
  assert.deepEqual(s4.table?.rows.map((r) => r.label), ["10월", "11월", "12월"]);
  assert.ok(s4.paragraphs.includes(`${row(db, "A10", "RX_VENUS_H06")!.text} ${row(db, "A10", "RX_VENUS_H06")!.action}`));
  assert.ok(s4.table!.rows[1].cells[0].includes(row(db, "A10", "RX_MERCURY_H06")!.careful_cell));
  assert.equal(skeleton.sections[2].table?.rows.length, 5);
  const qb = db.dbs.A17a.rows.find((r) => r.competency === "기대기" && r.wish === "안정")!;
  assert.deepEqual(skeleton.questions.items, [qb.q1, qb.q2, qb.q3]);
  assert.equal(skeleton.practices.length, 3);
  assert.ok(skeleton.closing.startsWith("이 리포트와 함께 3일 동안 쏘웰라 이용권이 제공됩니다."));
  assert.ok(!skeleton.closing.includes("→"));
  // 뼈대 문장에도 빈칸 토큰이 남지 않는다
  assert.ok(!JSON.stringify(skeleton).includes("{{"));
});

test("{{근거}} 구절은 '-는'으로 끝난다", () => {
  assert.equal(evidencePhrase(db, { kind: "house", transit: "jupiter", house: 4, intervals: [], days: 100, value: 1 })?.endsWith("지나는"), true);
  assert.equal(evidencePhrase(db, { kind: "aspect", transit: "saturn", target: "moon", aspect: "삼분", intervals: [], exact: "2028-06-07", value: 1, profection: false }), "토성이 태어날 때의 달과 자연스럽게 돕는 각도를 이루는");
  assert.equal(evidencePhrase(db, undefined), null);
});

test("AI 프롬프트: 자리표시자를 채우고 {{토큰}} 예시는 그대로, 실제 날짜 값은 주지 않는다", () => {
  const { built, skeleton } = setup();
  const sys = fillSystemPrompt(built, skeleton.dbSentences[4]);
  assert.ok(!/\{(nickname|character|tokens|db_sentences)\}/.test(sys));
  assert.ok(sys.includes("{{E2_기간}}"));
  assert.ok(sys.includes("지우님"));
  const user = partUserMessage(built, "A");
  assert.ok(user.startsWith("이번에는 다음 섹션만 쓰세요(제목 줄 그대로): ### 4."));
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(sys + user));
});

const GOOD_A = `### 4. 연말까지 조심하면 좋을 것
지우님, 지금부터 연말까지는 일과 말을 한 번 더 확인하면 좋은 시기입니다.

{{E1_기간}}에는 매일의 일을 다시 살펴보게 돼요. 메일을 보내기 전에 한 번 더 읽어 보세요. 오해가 생기면 바로 짧게 확인하는 편이 좋습니다.`;

test("AI 출력 처리: 통과하면 토큰을 실제 날짜로 바꾸고 섹션별 문단으로 나눈다", () => {
  const { built } = setup();
  const out = processPartOutput(GOOD_A, "A", built, c1);
  assert.equal(out.ok, true, JSON.stringify(out.issues));
  const paras = out.sections[4]!;
  assert.equal(paras.length, 2);
  assert.ok(!paras.join("").includes("{{"));
  assert.ok(paras[1].startsWith(built.tokens["E1_기간"].value));
});

test("AI 출력 처리: 토큰 밖 숫자·제목 누락·금지어·없는 토큰이면 실패(→ 재생성 또는 DB 뼈대)", () => {
  const { built } = setup();
  assert.equal(processPartOutput(GOOD_A.replace("{{E1_기간}}", "11월 3일"), "A", built, c1).ok, false);
  assert.equal(processPartOutput(GOOD_A.replace("### 4. 연말까지 조심하면 좋을 것", "### 4. 연말"), "A", built, c1).ok, false);
  assert.equal(processPartOutput(GOOD_A + "\n\n반드시 좋아집니다.", "A", built, c1).ok, false);
  assert.equal(processPartOutput(GOOD_A.replace("{{E1_기간}}", "{{E9_기간}}"), "A", built, c1).ok, false);
});

test("AI 출력 처리: 캐릭터 동물 이름이 나오면 실패(당분간 화면 비노출)", () => {
  const { built } = setup();
  assert.equal(processPartOutput(GOOD_A + "\n\n수달처럼 먼저 다가가 보세요.", "A", built, c1, ["수달"]).ok, false);
  assert.equal(processPartOutput(GOOD_A, "A", built, c1, ["수달"]).ok, true);
});

test("바람 v3: 리포트 입력에 판정 이름 두 말·움직임·기질·흐름 토큰이 들어간다", () => {
  const { built, skeleton } = setup();
  const i = built.input;
  assert.ok(Object.values(i.wish_support).every((v) => /^(활짝 열리는 해\(순풍\)|내 손에 달린 해\(보통\)|기반을 다지는 해\(역풍\))$/.test(v)));
  assert.equal(i.temperament, "활동"); // 샘플 기질(원본 샘플 판정 JSON)
  assert.equal(i.movement[Object.keys(i.movement)[0]], "움직이는 해"); // 2027 = 움직이는 해
  assert.ok(i.flow_2027.length >= 2 && i.flow_2027.every((t) => built.tokens[t.slice(2, -2)]));
  // 스펙 샘플의 흐름: 연말 다시 보기 → 1~4월 준비 → 4·6월 제안과 계기 → 7월 말부터 자리 잡기 → 9월 정리
  assert.deepEqual(skeleton.sections.find((x) => x.no === 5)!.flow, ["2026년 연말 다시 보기", "1~4월 정하지 말고 준비", "4·6월 제안과 계기", "7월부터 정하고 자리 잡기", "9월 정리"]);
  const s6 = skeleton.sections.find((x) => x.no === 6)!;
  assert.equal(s6.stars?.length, 5);
  assert.equal(s6.stars?.find((x) => x.firstOpen)?.year, 2028);
  assert.ok(s6.table!.rows.every((r) => /\((순풍|보통|역풍)\)/.test(r.cells[0])));
  const sys = fillSystemPrompt(built, []);
  assert.ok(!/(?<!\{)\{(movement|temperament|wish_support)\}(?!\})/.test(sys));
});

test("결제 전 미리보기: 섹션마다 첫 문장 하나만(본문은 보내지 않음)", () => {
  const { skeleton } = setup();
  const lines = previewLines(skeleton);
  assert.deepEqual(lines.map((l) => l.no), [4, 5, 6, 7]);
  for (const l of lines) {
    const full = skeleton.sections.find((x) => x.no === l.no)!.paragraphs.join(" ");
    if (!full) continue;
    assert.ok(full.startsWith(l.first), `${l.no}`);
    assert.ok(l.first.length < full.length, `${l.no}: 본문 전체를 보내면 안 됨`);
    assert.equal(l.first.match(/[.!?](\s|$)/g)?.length ?? 1, 1, `${l.no}: 한 문장만`);
  }
});

test("A11 하늘의 공통 흐름: 5년 파트(2027~)에 걸치는 것만, A6 역량·방식은 5번 AI 바탕 문장에", () => {
  const { skeleton } = setup();
  const sky = skeleton.sections.find((x) => x.no === 6)!.commonSky!;
  assert.ok(sky.length >= 5);
  assert.ok(!sky.some((c) => c.period === "2026년 10~11월")); // 연말(2026)만 걸치는 것은 빠짐
  assert.ok(sky.some((c) => c.event.includes("목성 처녀자리")));
  const a6 = db.dbs.A6.rows.find((r) => r.kind === "역량" && r.name === "기대기")!.plain;
  assert.ok(skeleton.dbSentences[5].includes(a6));
  assert.ok(!skeleton.sections.find((x) => x.no === 5)!.paragraphs.includes(a6)); // 뼈대 본문에는 넣지 않음
});

test("섹션 나누기: 6·7을 한 출력에서 나눈다", () => {
  const s = splitSections("### 6. 앞으로 5년의 흐름\n가.\n\n나.\n### 7. 별이 주는 질문과 웰니스 제안\n다.");
  assert.deepEqual(s[6], ["가.", "나."]);
  assert.deepEqual(s[7], ["다."]);
});
