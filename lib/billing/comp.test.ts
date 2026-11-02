import { test } from "node:test";
import assert from "node:assert/strict";
import { isCompEmail } from "./comp.ts";

test("관리자 계정 이메일만 무료 열람(대소문자·공백 무시)", () => {
  assert.equal(isCompEmail("seotaiji0124@naver.com", ""), true);
  assert.equal(isCompEmail(" SeoTaiji0124@Naver.com ", ""), true);
  assert.equal(isCompEmail("someone@naver.com", ""), false);
  assert.equal(isCompEmail(null, ""), false);
  assert.equal(isCompEmail("", ""), false);
});

test("환경변수로 더한 계정도 무료 열람", () => {
  assert.equal(isCompEmail("a@b.com", "x@y.com, a@b.com"), true);
  assert.equal(isCompEmail("c@d.com", "x@y.com, a@b.com"), false);
});

test("기한 있는 무료 열람은 그 시각까지만(시험 계정 2026-11-02 하루)", () => {
  assert.equal(isCompEmail("owner-test@ssolwellnesshouse.com", "", new Date("2026-11-02T14:00:00Z")), true); // 23시 KST
  assert.equal(isCompEmail("owner-test@ssolwellnesshouse.com", "", new Date("2026-11-02T15:00:01Z")), false); // 11월 3일 0시 넘음
});
