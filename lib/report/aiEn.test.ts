import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { build } from "../../scripts/gen_prompt_en.mjs";
import { SYSTEM_PROMPT_TEMPLATE_EN } from "./systemPromptEn.ts";
import { compileC1En, c1EnHits, validateReportEn, type C1EnRow } from "./validateEn.ts";
import { checkBridge } from "./aiPrompt.ts";
import { buildEnDb } from "./dbEn.ts";

const read = (p: string) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), "utf8"));
const rules = compileC1En((read("../../data/astro/db/c1_en.json") as { rows: C1EnRow[] }).rows);

test("영문 프롬프트 파일은 번역 묶음 원본 + FIXES로 만든 것과 같다(손으로 고치지 않음)", () => {
  assert.equal(SYSTEM_PROMPT_TEMPLATE_EN, build(read("../../docs/spec/20_영문번역/영문번역_화면문구·안내_KO-EN_재번역1104.json")));
  assert.ok(!SYSTEM_PROMPT_TEMPLATE_EN.includes("both parts"));
  assert.ok(!SYSTEM_PROMPT_TEMPLATE_EN.includes("150–320 characters"));
});

test("C1_EN 71개 규칙이 모두 JS 정규식으로 바뀐다", () => {
  assert.equal(rules.length, 71);
});

test("영문 해석 DB 문장은 C1_EN '실패' 0건(개발메모 §8 — DB 범위)", () => {
  const en = buildEnDb(read("../../data/astro/db/astro_db_v1.4.json"), read("../../data/astro/db/astro_db_en_overlay.json"));
  const fails: string[] = [];
  for (const t of Object.values(en.dbs))
    for (const r of t.rows)
      for (const [k, v] of Object.entries(r))
        if (typeof v === "string" && /[A-Za-z]/.test(v) && !k.endsWith("_en") && !/(_id|_theory|^id|note|pattern)$/.test(k) && t.db !== "C1")
          for (const h of c1EnHits(v, rules, "DB")) if (h.severity !== "경고") fails.push(`${t.db} ${r.id} ${k}: ${h.detail}`);
  assert.deepEqual(fails, []);
});

test("영문 나쁜 예시는 걸린다(프롬프트 'Bad examples')", () => {
  const opts = { allowedTokens: ["Y2027"], allowedNames: ["Jupiter"], c1Rules: rules };
  const bad = (t: string) => validateReportEn(t, opts).filter((i) => i.severity !== "경고");
  assert.ok(bad("In 2027, you will definitely meet the love you want.").length > 0); // 토큰 밖 숫자 + 단정
  assert.ok(bad("Thanks to Jupiter, your salary will rise.").some((i) => i.code === "c1"));
  // 경제적 여유를 바라면 수입 이야기 자체를 막는다
  assert.ok(validateReportEn("Thanks to Jupiter, your salary is going to go up.", { ...opts, wish: "Financial ease" }).some((i) => i.code === "money_predict"));
  // 이모지 규칙(파이썬 \U 표기)도 JS에서 동작
  assert.ok(validateReportEn("Jupiter smiles 🌟 on you.", opts).some((i) => i.detail.startsWith("BAN_EN_061")));
  assert.ok(!validateReportEn("Jupiter opens a door.", opts).some((i) => i.detail.startsWith("BAN_EN_061")));
  assert.ok(bad("Saturn asks you to slow down.").some((i) => i.code === "unknown_planet_or_sign"));
  assert.ok(bad("**Bold** text").some((i) => i.code === "markdown_bold"));
  assert.deepEqual(bad("In {{Y2027}}, Jupiter opens a quieter door for you. Trust your pace."), []);
  // 하우스 번호는 입력에 있는 것만
  assert.ok(validateReportEn("Jupiter moves through your 5th house.", { ...opts, allowedHouses: [5] }).every((i) => i.code !== "digit_outside_token"));
  assert.ok(validateReportEn("Jupiter moves through your 7th house.", { ...opts, allowedHouses: [5] }).some((i) => i.code === "digit_outside_token"));
});

test("영문 잇기: 프롬프트의 좋은 예시는 통과, 짧거나 질문으로 끝나면 실패", () => {
  const good =
    "You long for Stability, yet this year family responsibilities reach your shoulders first. During {{S_기간}}, Saturn squares your Moon and family matters crowd your heart, so don't carry everything alone: choose the one thing that is truly yours to handle. Then, {{흐름근거}}, Jupiter brings fresh air into your home and your heart, little by little. Make that your steadfast anchor, the one thing you hold even when life shakes: starting this week, set aside Sunday evenings for a cup of tea with your family.";
  const values = { S_기간: "March–October", 흐름근거: "late July, when Jupiter moves into your home & roots area" };
  assert.deepEqual(checkBridge(good, { wish: "Stability", judgement: "", values, lang: "en" }), []);
  assert.ok(checkBridge("Stability comes {{S_기간}}. Do it. Now. Really?", { wish: "Stability", judgement: "", values, lang: "en" }).length > 0);
  assert.ok(checkBridge(good, { wish: "Recognition", judgement: "", values, lang: "en" }).includes("no_wish"));
});
