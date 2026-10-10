import assert from "node:assert/strict";
import { test } from "node:test";
import { pathOf, prevStep, restorableStep, stepFromPath } from "./steps.ts";

test("이전 버튼은 바로 앞 화면으로, 처음 안내를 거쳤으면 그 안내로 돌아간다", () => {
  assert.equal(prevStep("experience", null), "welcome");
  assert.equal(prevStep("birth", true), "firstTime");
  assert.equal(prevStep("birth", false), "experience");
  assert.equal(prevStep("questions", false), "birth");
});

test("첫 화면·계산 중·후보 선택·동의·결과에는 이전 버튼이 없다", () => {
  for (const s of ["welcome", "loading", "candidates", "consent", "result"] as const) assert.equal(prevStep(s, true), null);
});

test("화면마다 주소: 주소 ↔ 화면이 서로 맞고, 계산 중·동의는 주소가 없다", () => {
  for (const s of ["welcome", "experience", "firstTime", "birth", "questions", "candidates", "result"] as const) assert.equal(stepFromPath(pathOf(s)), s);
  assert.equal(pathOf("welcome"), "/test");
  assert.equal(pathOf("questions"), "/test/questions");
  assert.equal(stepFromPath("/test/"), "welcome");
  assert.equal(stepFromPath("/test/q1"), null); // 예전 주소는 없음
});

test("새로고침: 앞 화면 답이 없으면 답이 있는 가장 뒤 화면으로, 결과는 질문 화면으로", () => {
  const p = { nickname: "지우", firstTime: false, consented: true, answers: {} };
  assert.equal(restorableStep("questions", p), "questions");
  assert.equal(restorableStep("result", p), "questions");
  assert.equal(restorableStep("questions", { ...p, consented: false }), "birth");
  assert.equal(restorableStep("birth", null), "welcome");
  assert.equal(restorableStep("firstTime", p), "experience"); // 처음 안내는 '처음'이라고 답한 사람만
});
