import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "./nextPath.ts";

test("safeNextPath는 사이트 안 경로만 허용한다", () => {
  assert.equal(safeNextPath("/test"), "/test");
  assert.equal(safeNextPath("/results/abc"), "/results/abc");
  assert.equal(safeNextPath(null), "/results");
  assert.equal(safeNextPath(""), "/results");
  assert.equal(safeNextPath("//evil.com"), "/results");
  assert.equal(safeNextPath("/\\evil.com"), "/results");
  assert.equal(safeNextPath("https://evil.com"), "/results");
  assert.equal(safeNextPath("test", "/x"), "/x");
});
