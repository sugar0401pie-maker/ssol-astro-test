import { test } from "node:test";
import assert from "node:assert/strict";
import { dailySaveLimit, ipBlocked, SAVE_LIMIT_MESSAGE } from "./saveLimit.ts";

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

test("IP: 하루 20개 또는 7일 60개에서 막는다", () => {
  assert.equal(ipBlocked(0, 0), false);
  assert.equal(ipBlocked(19, 59), false);
  assert.equal(ipBlocked(20, 20), true);
  assert.equal(ipBlocked(5, 60), true);
});
