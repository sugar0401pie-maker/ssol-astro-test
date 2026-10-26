import { test } from "node:test";
import assert from "node:assert/strict";
import { dailySaveLimit, SAVE_LIMIT_MESSAGE } from "./saveLimit.ts";

test("하루 저장 한도는 기본 3, 올바른 환경변수만 반영", () => {
  assert.equal(dailySaveLimit(undefined), 3);
  assert.equal(dailySaveLimit(""), 3);
  assert.equal(dailySaveLimit("0"), 3);
  assert.equal(dailySaveLimit("2.5"), 3);
  assert.equal(dailySaveLimit("abc"), 3);
  assert.equal(dailySaveLimit("101"), 3);
  assert.equal(dailySaveLimit("5"), 5);
});

test("안내 문장에 한도 숫자가 들어간다", () => {
  assert.match(SAVE_LIMIT_MESSAGE(3), /하루에 3번까지/);
});
