import assert from "node:assert/strict";
import { test } from "node:test";
import { prevStep } from "./steps.ts";

test("이전 버튼은 바로 앞 화면으로, 처음 안내를 거쳤으면 그 안내로 돌아간다", () => {
  assert.equal(prevStep("experience", null), "welcome");
  assert.equal(prevStep("birth", true), "firstTime");
  assert.equal(prevStep("birth", false), "experience");
  assert.equal(prevStep("q1", false), "birth");
  assert.equal(prevStep("q3", false), "q2");
});

test("첫 화면·계산 중·후보 선택·동의·결과에는 이전 버튼이 없다", () => {
  for (const s of ["welcome", "loading", "candidates", "tie", "consent", "result"] as const) assert.equal(prevStep(s, true), null);
});

import { pathOf, restorableStep, stepFromPath } from "./steps.ts";

test("화면마다 주소: 주소 ↔ 화면이 서로 맞고, 계산 중·동의는 주소가 없다", () => {
  for (const s of ["welcome", "experience", "firstTime", "birth", "q1", "q2", "q3", "candidates", "tie", "result"] as const) assert.equal(stepFromPath(pathOf(s)), s);
  assert.equal(pathOf("welcome"), "/test");
  assert.equal(stepFromPath("/test/"), "welcome");
  assert.equal(stepFromPath("/test/nothing"), null);
});

test("새로고침: 앞 화면 답이 없으면 답이 있는 가장 뒤 화면으로, 결과는 마지막 질문으로", () => {
  const p = { nickname: "지우", firstTime: false, consented: true, answers: { q1: "연애" } };
  assert.equal(restorableStep("q2", p), "q2");
  assert.equal(restorableStep("q3", p), "q2");
  assert.equal(restorableStep("result", { ...p, answers: { q1: "연애", q2: "변화" } }), "q3");
  assert.equal(restorableStep("q1", { ...p, consented: false }), "birth");
  assert.equal(restorableStep("birth", null), "welcome");
  assert.equal(restorableStep("firstTime", p), "experience"); // 처음 안내는 '처음'이라고 답한 사람만
});
