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
