import { test } from "node:test";
import assert from "node:assert/strict";
import { swipeDirection } from "./swipe.ts";

test("왼쪽으로 밀면 다음 장, 오른쪽이면 이전 장", () => {
  assert.equal(swipeDirection(-120, 10, 300), "next");
  assert.equal(swipeDirection(120, -10, 300), "prev");
});

test("짧거나 느리거나 세로 스크롤이면 넘기지 않는다", () => {
  assert.equal(swipeDirection(-40, 0, 200), null);
  assert.equal(swipeDirection(-150, 0, 1200), null);
  assert.equal(swipeDirection(-100, 90, 300), null);
});
