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

test("탭·줄바꿈·역슬래시로 감싼 외부 주소도 막는다", () => {
  assert.equal(safeNextPath("/\t/evil.com"), "/results");
  assert.equal(safeNextPath("/\n/evil.com"), "/results");
  assert.equal(safeNextPath("/\r\n/evil.com"), "/results");
  assert.equal(safeNextPath("/x\\y"), "/results");
  assert.equal(safeNextPath("/results/abc?x=1#y"), "/results/abc?x=1#y");
  assert.equal(safeNextPath("/%2F%2Fevil.com"), "/%2F%2Fevil.com"); // 인코딩된 채로는 사이트 안 경로
});
