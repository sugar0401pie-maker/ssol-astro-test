import { test } from "node:test";
import assert from "node:assert/strict";
import { authErrorEn, GENERIC_EN_ERROR } from "./authText.ts";

test("알려진 한국어 오류는 영어로, 모르는 오류는 일반 영문 오류로", () => {
  assert.equal(authErrorEn("이메일 또는 비밀번호가 올바르지 않아요."), "That email or password doesn’t look right.");
  assert.equal(authErrorEn("처음 보는 오류"), GENERIC_EN_ERROR);
  assert.equal(authErrorEn(undefined), GENERIC_EN_ERROR);
  assert.ok(!/[가-힣]/.test(authErrorEn("아무 말")));
});
