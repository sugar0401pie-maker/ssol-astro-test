import { test } from "node:test";
import assert from "node:assert/strict";
import { Q1_OPTIONS, Q3_ALL, Q2_ALL } from "../astro/answers.ts";
import { EN_Q1, EN_Q2, EN_Q3, completeAnswers } from "./questions.ts";

test("영문 선택지 값은 모두 한국어 저장 키(해석 DB가 찾는 값)", () => {
  assert.deepEqual(EN_Q1.map(([k]) => k), [...Q1_OPTIONS]);
  assert.deepEqual(EN_Q3.map(([k]) => k), [...Q3_ALL]);
  for (const [k] of EN_Q2) assert.ok((Q2_ALL as readonly string[]).includes(k));
  assert.equal(EN_Q2.length, 10);
});

test("영문 글자에 한글이 없다", () => {
  for (const [, en] of [...EN_Q1, ...EN_Q2, ...EN_Q3]) assert.ok(!/[가-힣]/.test(en), en);
});

test("세 답이 다 있어야 완성", () => {
  assert.equal(completeAnswers({ q1: "연애", q2: "버텨" }), false);
  assert.equal(completeAnswers({ q1: "연애", q2: "버텨", q3: "안정" }), true);
});
