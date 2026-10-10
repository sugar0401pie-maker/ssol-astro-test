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
import { buildPaidSkeleton, evidencePhrase, yearize, type Block } from "./paidSkeleton.ts";
import { buildReportInput } from "./reportInput.ts";
import { previewLines } from "./prepare.ts";
import { buildChatSummary, CHAT_SUMMARY_MAX } from "./chatSummary.ts";
import { buildFreeResult } from "./freeResult.ts";
import { fillSystemPrompt, partUserMessage, processPartOutput, splitSections } from "./aiPrompt.ts";
import { SYSTEM_PROMPT_TEMPLATE } from "./systemPrompt.ts";
import { compileC1, type C1Row } from "./validate.ts";

const db: AstroDb = JSON.parse(readFileSync(new URL("../../data/astro/db/astro_db_v1.3.json", import.meta.url), "utf8"));
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
  const flow = skeleton.sections.find((s) => s.no === 5)!.body.filter((b) => b.t === "step").map((b) => (b as { label: string }).label);
  const built = buildReportInput({ nickname: "지우", chart, character, answers, periods, wish, typeLine: "누군가에게 기대는 일에 에너지가 많이 들고, 그럴 때 먼저 다가가는 유형", flow, bridgeBasis27: skeleton.bridgeBasis27, desiredYear: skeleton.desiredYear });
  return { skeleton, built, wish };
}

test("시스템 프롬프트가 스펙 06 문서의 '시스템 프롬프트 전문'과 같다(손으로 고치지 않기)", () => {
  const md = readFileSync(new URL("../../docs/spec/06_리포트프롬프트_점성술.md", import.meta.url), "utf8");
  const i = md.indexOf("## 시스템 프롬프트 전문");
  assert.equal(SYSTEM_PROMPT_TEMPLATE, md.slice(md.indexOf("\n", i) + 1).trim());
});

test("DB 뼈대: 4섹션 모두 있고, 연말 조심할 세 가지에 금성 역행(6H), 달마다 살펴볼 것 11월에 수성 역행(6H), 질문·실천은 DB 그대로", () => {
  const { skeleton } = setup();
  assert.deepEqual(skeleton.sections.map((s) => s.no), [4, 5, 6, 7]);
  const s4 = skeleton.sections[0];
  assert.equal(s4.summary, "지우님, 지금부터 연말까지는 일과 말을 조심해야 하는 시기입니다.");
  assert.equal(s4.table, null);
  const items = s4.body.find((b) => b.t === "items") as Extract<Block, { t: "items" }>;
  assert.equal(items.items[0].title, row(db, "A10", "RX_VENUS_H06")!.careful_cell);
  const subs = s4.tail.filter((b) => b.t === "sub").map((b) => (b as { text: string }).text);
  assert.deepEqual(subs, ["• 10월", "• 11월", "• 12월"]);
  const nov = s4.tail[s4.tail.findIndex((b) => b.t === "sub" && b.text === "• 11월") + 1] as { text: string };
  assert.ok(nov.text.includes(row(db, "A10", "RX_MERCURY_H06")!.careful_cell));
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
  assert.equal(evidencePhrase(db, { kind: "aspect", transit: "saturn", target: "moon", aspect: "삼분", intervals: [], exact: "2028-06-07", value: 1, profection: false }), "토성이 달을 돕는");
  assert.equal(evidencePhrase(db, undefined), null);
});

test("AI 프롬프트: 자리표시자를 채우고 {{토큰}} 예시는 그대로, 실제 날짜 값은 주지 않는다", () => {
  const { built, skeleton } = setup();
  const sys = fillSystemPrompt(built, skeleton.dbSentences[4]);
  assert.ok(!/\{(nickname|character|tokens|db_sentences)\}/.test(sys));
  assert.ok(sys.includes("{{E2_기간}}"));
  assert.ok(sys.includes("지우님"));
  const user = partUserMessage(built, "A", { 4: skeleton.sections[0].summary });
  assert.ok(user.startsWith("이번에는 다음 섹션만 쓰세요(제목 줄 그대로): ### 4."));
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(sys + user));
  // 5년 요약의 연도는 토큰으로 바꿔 준다(AI가 숫자를 쓰지 않게)
  const userC = partUserMessage(built, "C", { 6: skeleton.sections[2].summary });
  assert.ok(userC.includes("{{열리는해}}") && !/"[^"]*2028년[^"]*"/.test(userC.split("입력(JSON)")[0]));
});

const GOOD_A = `### 4. 연말까지 조심하면 좋을 것
지우님, 지금부터 연말까지는 일과 말을 한 번 더 확인하면 좋은 시기입니다.

{{E1_기간}}에는 매일의 일을 다시 살펴보게 돼요. 메일을 보내기 전에 한 번 더 읽어 보세요. 오해가 생기면 바로 짧게 확인하는 편이 좋습니다.`;

test("AI 출력 처리: 통과하면 토큰을 실제 날짜로 바꾸고 섹션별 문단으로 나눈다", () => {
  const { built } = setup();
  const out = processPartOutput(GOOD_A, "A", built, c1);
  assert.equal(out.ok, true, JSON.stringify(out.issues));
  const blocks = out.sections[4]!;
  assert.equal(blocks.length, 2);
  assert.ok(!JSON.stringify(blocks).includes("{{"));
  assert.ok((blocks[1] as { text: string }).text.startsWith(built.tokens["E1_기간"].value));
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
  const steps = skeleton.sections.find((x) => x.no === 5)!.body.filter((b) => b.t === "step").map((b) => (b as { label: string }).label);
  assert.deepEqual(steps, ["2026년 연말 — 다시 보기", "1~4월 — 정하지 말고 준비", "4·6월 — 제안과 계기", "7월 말부터 — 정하고 자리 잡기", "9월 — 정리"]);
  const s6 = skeleton.sections.find((x) => x.no === 6)!;
  assert.equal(s6.stars?.length, 5);
  assert.equal(s6.stars?.find((x) => x.firstOpen)?.year, 2028);
  assert.ok(s6.table!.rows.every((r) => /\((순풍|보통|역풍)\)/.test(r.cells[0])));
  const sys = fillSystemPrompt(built, []);
  assert.ok(!/(?<!\{)\{(movement|temperament|wish_support)\}(?!\})/.test(sys));
});

test("결제 전 미리보기: 섹션마다 굵은 요약 + 본문 앞 두 문장만(본문은 보내지 않음)", () => {
  const { skeleton } = setup();
  const lines = previewLines(skeleton);
  assert.deepEqual(lines.map((l) => l.no), [4, 5, 6, 7]);
  for (const l of lines) {
    const s = skeleton.sections.find((x) => x.no === l.no)!;
    assert.equal(l.first, s.summary ?? "");
    assert.ok(l.lines.length <= 2, `${l.no}`);
    assert.ok(l.lines.join(" ").length < JSON.stringify(s.body).length, `${l.no}: 본문 전체를 보내면 안 됨`);
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
  assert.ok(!JSON.stringify(skeleton.sections.find((x) => x.no === 5)!.body).includes(a6)); // 뼈대 본문에는 넣지 않음
});

test("쏘웰라 채팅 요약: 유형·바라는 것·5년·2026 회고(+결제 시 본문·제안), 별자리·출생 정보·동물 이름 없음", () => {
  const { skeleton, wish } = setup();
  const free = buildFreeResult({
    db, chart: computeNatal(new Date(Date.UTC(1996, 3, 1, 1, 17)), 37.2893, 127.0535).chart,
    longitudes: computeNatal(new Date(Date.UTC(1996, 3, 1, 1, 17)), 37.2893, 127.0535).L,
    character: judgeCharacter(computeNatal(new Date(Date.UTC(1996, 3, 1, 1, 17)), 37.2893, 127.0535).L, computeNatal(new Date(Date.UTC(1996, 3, 1, 1, 17)), 37.2893, 127.0535).chart.elements, ref),
    answers: { q1: "직업·커리어", q2: "변화", q3: "안정" }, nickname: "지우", birthYear: 1996, now: NOW,
  });
  const answers = { q1: "직업·커리어", q2: "변화", q3: "안정" } as const;
  const freeOnly = buildChatSummary({ db, free, answers, wish });
  assert.ok(freeOnly.startsWith("[1. 별이 본 나의 유형] 누군가에게 기대는 일에"));
  assert.ok(freeOnly.includes("[2. 2027년에 바라는 것과 앞으로 5년의 흐름] 2027년에 바라는 것: 안정."));
  assert.ok(freeOnly.includes("2028년: 활짝 열리는 해(순풍)"));
  assert.ok(freeOnly.includes("[3. 2026년 회고] 2026년을 한 단어로: 변화."));
  assert.ok(!freeOnly.includes("[8."));
  for (const banned of ["양자리", "처녀자리", "쌍둥이자리", "1996", "경기", "수달"]) assert.ok(!freeOnly.includes(banned), banned);
  assert.equal(freeOnly.split("\n").length, 3);
  const withPaid = buildChatSummary({ db, free, answers, wish, paid: skeleton });
  assert.ok(withPaid.includes("[8. 별이 주는 질문과 웰니스 제안]"));
  assert.ok(withPaid.includes("[4. 연말까지 조심하면 좋을 것]"));
  assert.ok(withPaid.length <= CHAT_SUMMARY_MAX);
  assert.ok(withPaid.split("\n").every((l) => /^\[\d\. [^\]]+\] \S/.test(l))); // 쏘웰라 reportSelect 형식
});

test("섹션 나누기: 6·7을 한 출력에서 나눈다", () => {
  const s = splitSections("### 6. 앞으로 5년의 흐름\n가.\n\n나.\n### 7. 별이 주는 질문과 웰니스 제안\n다.");
  assert.deepEqual(s[6], ["가.", "나."]);
  assert.deepEqual(s[7], ["다."]);
});

test("C등급(시간 모름)은 연말·2027 파트에 프로토타입 안내 문장을 밝힌다(5-2)", () => {
  const answers: Answers = { q1: "직업·커리어", q2: "변화", q3: "안정" };
  const { chart, L } = computeNatal(new Date(Date.UTC(1996, 3, 1, 1, 17)), 37.2893, 127.0535);
  const character = judgeCharacter(L, chart.elements, ref);
  const events = buildTimeline(L, { start: "2026-01-01", end: "2031-12-31" }, periodWindows(NOW).eoy);
  const periods = selectPeriods(events, answers.q1, NOW);
  const wish = computeWish(L, answers.q3, { birthDate: "1996-04-01", dayChart: null });
  const gradeC = "태어난 시간을 몰라 하우스·상승궁 없이, 바람의 주제 행성과 달의 흐름으로만 판정했어요.";
  const sk = (accuracy: "A" | "C") =>
    buildPaidSkeleton({ db, chart: { ...chart, accuracy }, longitudes: L, character, answers, events, periods, wish, nickname: "지우" });
  const c = sk("C");
  assert.ok(c.dbSentences[5].includes(gradeC));
  assert.ok(c.sections[0].body.some((b) => b.t === "note" && b.text.startsWith("태어난 시간을 몰라, 이 파트의 ‘자리’는")));
  assert.ok(!sk("A").dbSentences[5].includes(gradeC));
});

test("5년 역풍 문단: '다가오는 해/이 해'와 조사를 그 연도로", () => {
  assert.equal(yearize("다가오는 해는 무겁고 이 해를 지나면", 2030), "2030년은 무겁고 2030년을 지나면");
});

test("바람과 흐름 잇기: 4문장·길이·바람 단어·토큰·겹침 검사, 실패하면 B12 대체 문장", () => {
  const { built, skeleton } = setup();
  const good = "안정을 바라는 지우님에게 이 해는 하늘이 정해 주기보다 내가 고르는 만큼 단단해지는 해예요. {{흐름근거}} 무렵에는 일터의 사람들 사이에서 내 자리를 다시 정리해 볼 여유가 생기기 쉽습니다. 그 전까지는 일이 몰리는 주에도 지킬 수 있는 퇴근 시간 하나를 정해 두면 좋습니다. 이번 주 금요일에는 팀 동료와 다음 달 일정을 함께 훑어보며 꼭 지킬 약속 하나를 정해 보세요.";
  const text = `### 5. 2027년을 맞는 마음가짐\n${skeleton.sections[1].summary!.replace("2027년", "{{Y2027}}")}\n\n지우님의 {{Y2027}}은 안정이 오는 해(보통)입니다. 하늘이 한쪽으로 기울지 않아요.\n\n<잇기>${good}</잇기>`;
  const ctx = { summaries: { 5: skeleton.sections[1].summary }, wish: "안정", judgements: { 5: "다른 문장" }, fallbackBridges: { 5: "대체 문장" } };
  const out = processPartOutput(text, "B", built, c1, [], ctx);
  assert.equal(out.ok, true, JSON.stringify(out.issues));
  assert.deepEqual(out.bridgeFailed, []);
  const blocks = out.sections[5]!;
  assert.equal(blocks.length, 2); // 요약 문단은 빠지고 판정 + 잇기
  assert.equal(blocks[1].t, "bridge");
  assert.ok((blocks[1] as { text: string }).text.includes(skeleton.bridgeBasis27));
  // 3문장이면 잇기만 실패 → B12 대체 문장
  const short = processPartOutput(text.replace(" 이번 주 금요일에는 팀 동료와 다음 달 일정을 함께 훑어보며 꼭 지킬 약속 하나를 정해 보세요.", ""), "B", built, c1, [], ctx);
  assert.deepEqual(short.bridgeFailed, [5]);
  assert.deepEqual(short.sections[5]![1], { t: "bridge", text: "대체 문장" });
  const missing = processPartOutput(text.replace(/<잇기>[\s\S]*<\/잇기>/, ""), "B", built, c1, [], ctx);
  assert.deepEqual(missing.bridgeFailed, [5]);
  assert.ok(missing.sections[5]!.some((b) => b.t === "bridge"));
});

test("DB 뼈대: 5·6번에 B12 대체 문장(흐름근거·바라던해 채움), 굵은 요약은 B11 틀", () => {
  const { skeleton } = setup();
  const s5 = skeleton.sections[1];
  assert.ok(s5.summary?.startsWith("지우님의 2027년은 안정이"));
  assert.ok(s5.body.some((b) => b.t === "bridge" && b.text.includes(skeleton.bridgeBasis27)));
  assert.ok(skeleton.sections[2].body.some((b) => b.t === "bridge" && b.text.includes("2028년")));
  assert.equal(skeleton.sections[2].summary, "지우님이 바라는 안정이 활짝 열리는 해(순풍)는 2028년입니다.");
  assert.ok(skeleton.sections[3].summary?.startsWith("지우님께 별이 드리는 질문은"));
});
