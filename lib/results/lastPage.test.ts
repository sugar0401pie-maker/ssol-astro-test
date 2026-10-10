import { test } from "node:test";
import assert from "node:assert/strict";
import { clampPage } from "./lastPage.ts";

test("결과 페이지 번호는 1~7만(그 밖·이상한 값은 1)", () => {
  assert.equal(clampPage("4"), 4);
  assert.equal(clampPage(7), 7);
  assert.equal(clampPage(0), 1);
  assert.equal(clampPage("8"), 1);
  assert.equal(clampPage("abc"), 1);
  assert.equal(clampPage(null), 1);
});
