import { test } from "node:test";
import assert from "node:assert/strict";
import { windowLimiter } from "./rateLimit.ts";

test("창 안에서는 max번까지, 창이 지나면 다시", () => {
  const l = windowLimiter(3, 1000);
  assert.deepEqual([0, 10, 20, 30].map((t) => l.take("a", t)), [true, true, true, false]);
  assert.equal(l.take("b", 30), true); // 다른 key는 따로 센다
  assert.equal(l.take("a", 1000), true); // 창이 지나면 새로
});

test("기억하는 key 수가 넘으면 가장 오래된 것부터 잊는다(메모리가 끝없이 늘지 않게)", () => {
  const l = windowLimiter(1, 1000, 2);
  assert.equal(l.take("a", 0), true);
  assert.equal(l.take("b", 0), true);
  assert.equal(l.take("c", 0), true); // a를 잊음
  assert.equal(l.take("a", 0), true);
  assert.equal(l.take("c", 0), false);
});
