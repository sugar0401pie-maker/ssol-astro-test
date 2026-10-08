// 해석 DB 연결 검사: ① 엔진이 만들 수 있는 모든 ID에 DB 행이 있다(빈칸 방지) ② DB 화면 문장이 C1 사전을
// 통과한다(owner의 validate_text.py와 같은 기준) ③ 문장 틀 채우기 ④ 스펙 샘플(1996-04-01 경기)이 샘플 리포트와 같은 선택을 한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHARACTER_GRID, COMPETENCY_BY_PLANET, ELEMENTS, SIGNS, STYLES } from "../astro/constants.ts";
import { Q1_OPTIONS, Q2_OPTIONS, Q3_ALL, type Answers } from "../astro/answers.ts";
import { b9Id } from "./movement.ts";
import { pickAspectLines } from "../astro/wheelLayout.ts";
import { lineKey } from "./freeResult.ts";
import { computeNatal } from "../astro/natal.ts";
import { judgeCharacter, type CalibrationTable } from "../astro/character.ts";
import { ELEMENT_ID, POINT_ID, SIGN_ID, fillTemplate, firstSentence, pad2, row, tryFill, type AstroDb } from "./db.ts";
import { c1Hits, compileC1, type C1Row } from "./validate.ts";
import { buildFreeResult, candidateCards } from "./freeResult.ts";

const db: AstroDb = JSON.parse(readFileSync(new URL("../../data/astro/db/astro_db_v1.2.json", import.meta.url), "utf8"));
const ref: CalibrationTable = JSON.parse(readFileSync(new URL("../../data/astro/calibration.json", import.meta.url), "utf8"));
const has = (t: string, id: string) => assert.ok(row(db, t, id), `${t} ${id} 없음`);

test("DB: 엔진이 만드는 ID가 모두 있다", () => {
  for (const s of SIGNS) {
    has("A1", `SIGN_${SIGN_ID[s]}`);
    has("A2", `SUN_${SIGN_ID[s]}`);
    has("A3", `MOON_${SIGN_ID[s]}`);
    has("A4", `ASC_${SIGN_ID[s]}`);
    for (const p of ["mercury", "venus", "mars", "jupiter", "saturn"]) has("B1a", `PL_${POINT_ID[p]}_${SIGN_ID[s]}`);
    for (const p of ["uranus", "neptune", "pluto"]) has("B1b", `PL_${POINT_ID[p]}_${SIGN_ID[s]}`);
  }
  for (let h = 1; h <= 12; h++) {
    for (const p of ["sun", "moon", "mercury", "venus", "mars"]) has("B2a", `HS_${POINT_ID[p]}_H${pad2(h)}`);
    for (const p of ["jupiter", "saturn", "uranus", "neptune", "pluto"]) has("B2b", `HS_${POINT_ID[p]}_H${pad2(h)}`);
    has("A16", `TERM_H${pad2(h)}`);
  }
  for (const t of ["jupiter", "saturn", "uranus", "neptune", "pluto"])
    for (const g of ["sun", "moon", "mercury", "venus", "mars", "asc", "mc"])
      for (const a of ["CONJ", "HARM", "TENSE"]) has("A8", `TR_${POINT_ID[t]}_${POINT_ID[g]}_${a}`);
  has("A8", "TR_SATURN_RETURN");
  for (const e of ELEMENTS) {
    has("A7", `ELEM_${ELEMENT_ID[e]}_STRONG`);
    has("A7", `ELEM_${ELEMENT_ID[e]}_WEAK`);
    for (const m of ELEMENTS) has("A17b", `TEMP_${ELEMENT_ID[e]}_${ELEMENT_ID[m]}`);
  }
  for (const [comp, names] of Object.entries(CHARACTER_GRID))
    names.forEach((n, i) => {
      const a5 = db.dbs.A5.rows.find((r) => r.character === n);
      assert.ok(a5 && a5.competency === comp && a5.style === STYLES[i], `A5 ${n}`);
      assert.ok(db.dbs.B6.rows.find((r) => r.character === n)?.choice_line, `B6 ${n}`);
    });
  Q2_OPTIONS.forEach((w, i) => assert.equal(row(db, "A12", `Q2_${pad2(i + 1)}`)?.word, w));
  for (const wish of Q3_ALL)
    for (const level of ["활짝 열리는 해(순풍)", "내 손에 달린 해(보통)", "기반을 다지는 해(역풍)", "열리는 해"]) assert.ok(db.dbs.A13.rows.find((r) => r.wish === wish && r.level === level), `A13 ${wish} ${level}`);
  for (const comp of Object.values(COMPETENCY_BY_PLANET)) {
    for (const d of Q1_OPTIONS) assert.ok(db.dbs.A14.rows.find((r) => r.competency === comp && r.domain === d), `A14 ${comp} ${d}`);
    for (const wish of Q3_ALL) assert.ok(db.dbs.A17a.rows.find((r) => r.competency === comp && r.wish === wish), `A17a ${comp} ${wish}`);
  }
  // 바람 판정 v3: 움직임 × 기질 × 바람 묶음(B9), 경계(B10), 유형 한 줄(A5 type_line)
  for (const mv of ["움직이는 해", "잔잔한 해"] as const)
    for (const tp of ["활동", "고정", "변통"] as const) for (const wish of ["도약", "안정"] as const) {
      const id = b9Id(mv, tp, wish);
      assert.ok(id && row(db, "B9", id)?.line, `B9 ${mv} ${tp} ${wish}`);
    }
  for (const id of ["EDGE_UP_CLEAR", "EDGE_UP_MIXED", "EDGE_MID_LOW", "EDGE_LOW_HIGH"]) has("B10", id);
  for (const r of db.dbs.A5.rows) assert.ok(r.type_line, `A5 type_line ${r.id}`);
  for (const id of ["FIX_DISCLAIMER", "FIX_GRADE_A", "FIX_GRADE_B", "FIX_GRADE_C", "FIX_ADD_TIME", "FIX_CANDIDATE_CHOICE", "FIX_PAYWALL_BOX", "FIX_CARE_CARD", "FIX_LOADING", "FIX_PRIVACY_NOTE"]) has("A15", id);
  for (const id of ["TP_SATURN_RETURN_1", "TP_SATURN_RETURN_2", "TP_JUPITER_RETURN", "TP_URANUS_OPPOSITION", "TP_NEPTUNE_SQUARE", "TP_URANUS_INTO_ASC_SIGN", "TP_SATURN_INTO_ASC_SIGN", "TP_QUIET_YEAR", "TP_SOLAR_ECLIPSE_ON_POINT", "TP_LUNAR_ECLIPSE_ON_POINT"]) has("A18", id);
});

const SKIP_KEYS = new Set(["id", "review_note", "dates", "image_file", "house", "house_label", "period_label", "event", "name", "minutes", "houses", "planets", "scene_hint", "in_service_range"]);
const DIGIT_OK_ROWS = new Set(["FIX_PAYWALL_BOX", "FIX_SOWELLA_3DAY"]);

test("DB: 화면 문장이 C1 금지어 사전과 숫자 규칙을 통과한다(validate_text.py와 같은 기준)", () => {
  const rules = compileC1(db.dbs.C1.rows as unknown as C1Row[]);
  assert.equal(rules.length, db.dbs.C1.rows.length);
  const fails: string[] = [];
  for (const [name, t] of Object.entries(db.dbs)) {
    if (name === "C1" || name === "C2") continue;
    for (const r of t.rows) {
      for (const [k, v] of Object.entries(r)) {
        if (SKIP_KEYS.has(k) || /(_theory|^p\d+_id$)/.test(k) || typeof v !== "string" || !v) continue;
        for (const h of c1Hits(v, rules, "DB")) if (h.severity === "실패") fails.push(`${name} ${r.id}.${k} ${h.detail}`);
        if (!DIGIT_OK_ROWS.has(r.id) && /[0-9０-９]/.test(v.replace(/\{\{[^{}]*\}\}|\{[^{}]*\}/g, " "))) fails.push(`${name} ${r.id}.${k} 숫자`);
      }
    }
  }
  assert.deepEqual(fails, []);
});

test("C1이 AI 출력의 금지 표현을 잡는다", () => {
  const rules = compileC1(db.dbs.C1.rows as unknown as C1Row[]);
  const fail = (t: string) => c1Hits(t, rules, "AI").filter((h) => h.severity === "실패").map((h) => h.detail.split(" ")[0]);
  assert.deepEqual(fail("이 시기에는 좋은 인연을 만나게 됩니다."), ["BAN_005", "BAN_013"]);
  assert.ok(fail("주식을 사기 좋은 때예요.").includes("BAN_059"));
  assert.ok(fail("수용전념 방식으로 해 보세요.").includes("BAN_056"));
  assert.ok(fail("융의 말처럼").includes("BAN_053"));
  assert.deepEqual(fail("융통성 있게 움직여 보세요."), []);
  assert.deepEqual(fail("한 달 동안 천천히 해 볼 만한 때예요."), []);
});

test("문장 틀 채우기: 조사·닉네임·빠진 토큰", () => {
  assert.equal(fillTemplate("{{행성:이/가}} 지나요", { 행성: "토성" }), "토성이 지나요");
  assert.equal(fillTemplate("{{행성:와/과}} 함께", { 행성: "목성" }), "목성과 함께");
  assert.equal(fillTemplate("{{행성:으로/로}}", { 행성: "달" }), "달로");
  assert.equal(fillTemplate("{닉네임}님", { 닉네임: "지우" }), "지우님");
  assert.throws(() => fillTemplate("{{날짜}}에", {}));
  assert.equal(tryFill("{{날짜}}에", {}), null);
  assert.equal(firstSentence("첫 문장입니다. 둘째 문장이에요."), "첫 문장입니다.");
});

function sample(answers: Answers = { q1: "직업·커리어", q2: "변화", q3: "안정" }) {
  const { chart, L } = computeNatal(new Date(Date.UTC(1996, 3, 1, 1, 17)), 37.2893, 127.0535);
  const character = judgeCharacter(L, chart.elements, ref);
  return buildFreeResult({ db, chart, longitudes: L, character, answers, nickname: "지우", birthYear: 1996, now: new Date("2026-10-07T03:00:00Z") });
}

test("샘플: 캐릭터·태양달 대비·원소가 샘플 리포트와 같은 DB 문장", () => {
  const r = sample();
  // 당분간 동물 이름은 브라우저에 보내지 않고 유형 한 줄로(show_character=false, 마스터스펙 6장)
  assert.equal(r.character.name, null);
  assert.equal(r.character.typeLine, row(db, "A5", "CHAR_01_OTTER")!.type_line);
  assert.equal(r.character.intro, null);
  assert.ok(!JSON.stringify(r).includes("수달"));
  assert.equal(r.character.why, row(db, "A5", "CHAR_01_OTTER")!.why_text);
  assert.equal(r.character.competencyLine, row(db, "A6", "COMP_LEAN")!.plain);
  assert.equal(r.character.styleLine, row(db, "A6", "STYLE_APPROACH")!.plain);
  // 샘플: "겉은 빠르고 당당한 양자리 태양이지만, 속은 차근차근 정리해야 편한 처녀자리 달이에요."
  assert.ok(r.character.sunMoonLine?.startsWith("겉은 빠르고 당당한 양자리 태양이지만, 속은 차근차근 정리해야 편한 처녀자리 달이에요."));
  assert.equal(r.elements.strong?.element, "불");
  assert.deepEqual(r.elements.weak.map((w) => w.element), ["공기"]);
  assert.equal(r.big3.length, 3);
  assert.equal(r.gradeNote, row(db, "A15", "FIX_GRADE_A")!.text);
  assert.equal(r.addTimeNote, null);
  assert.equal(r.dbDraft, true);
});

test("샘플: 휠 각도 선마다 탭 시트(B3)와 처음 안내 말풍선 3개가 있다", () => {
  const r = sample();
  const lines = pickAspectLines(r.chart.aspects, true);
  assert.ok(lines.length > 0);
  for (const l of lines) assert.ok(r.wheelSheets.lines[lineKey(l.a, l.b, l.aspect)], `${l.a}-${l.b} ${l.aspect}`);
  assert.equal(r.wheelTips.length, 3);
});

test("샘플: 2026 회고 — '변화'는 하늘과 맞는 도입문, 전환점은 토성 리턴·천왕성 상승궁 진입 두 개(샘플과 같음)", () => {
  const r = sample();
  assert.equal(r.year2026.intro, row(db, "A12", "Q2_03")!.intro_match);
  assert.equal(r.year2026.turningPoints.length, 2);
  assert.ok(r.year2026.turningPoints[0].startsWith("2월 7일에는 토성이 태어날 때의 자리로 처음 돌아오는"));
  assert.ok(r.year2026.turningPoints[1].startsWith("4월 26일에는 변화의 별 천왕성이 상승궁 별자리인 쌍둥이자리에"));
  // 1분기 표에는 토성 리턴 과거형 문장, 지금 지나는 4분기는 미래형
  assert.ok(r.year2026.quarters[0].cell.includes(row(db, "A8", "TR_SATURN_RETURN")!.table_past));
  assert.ok(!r.year2026.quarters[3].cell.includes("거예요") || r.year2026.quarters[3].cell === "—");
  assert.equal(r.year2026.quarters[0].reasons[0].title.length > 0, true);
  assert.equal(r.care, null);
  // 유료 본문은 담지 않는다
  assert.ok(!JSON.stringify(r).includes("events_eoy"));
});

test("부드러운 톤: 결과 하단 카드(care_note + FIX_CARE_CARD)", () => {
  const r = sample({ q1: "연애", q2: "이별", q3: "사랑" });
  assert.equal(r.softTone, true);
  assert.equal(r.care?.note, row(db, "A12", "Q2_06")!.care_note);
  assert.ok(r.care?.card.startsWith("올해 마음이 많이 무거웠다면"));
  assert.ok(!r.care?.card.includes("→"));
});

test("C등급: 하우스 없이, 전환점은 C등급판, 휠 시트에 하우스 없음", () => {
  const { chart, L } = computeNatal(new Date(Date.UTC(1996, 3, 1, 3, 0)), 37.2893, 127.0535, false);
  const character = judgeCharacter(L, chart.elements, ref);
  const r = buildFreeResult({ db, chart, longitudes: L, character, answers: { q1: "가족", q2: "버텨", q3: "회복" }, nickname: "하늘", birthYear: 1996, now: new Date("2026-10-07T03:00:00Z") });
  assert.equal(r.big3.length, 2);
  assert.equal(r.gradeNote, row(db, "A15", "FIX_GRADE_C")!.text);
  assert.ok(r.addTimeNote && !r.addTimeNote.includes("→"));
  assert.ok(r.year2026.turningPoints.every((t) => !t.includes("{{") && !t.includes("하우스")));
  assert.ok(Object.values(r.wheelSheets.planets).every((s) => !s!.title.includes("하우스")));
  assert.equal(r.wheelSheets.planets.mars?.partial, true);
  assert.equal(r.wheelSheets.planets.sun?.partial, false);
});

test("후보 선택 카드(B6)", () => {
  const c = candidateCards(db, ["복어", "수달"]);
  assert.equal(c.intro, row(db, "A15", "FIX_CANDIDATE_CHOICE")!.text);
  assert.ok(c.cards["복어"].length > 0 && c.cards["수달"].length > 0);
});
