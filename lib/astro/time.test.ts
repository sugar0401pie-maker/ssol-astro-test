import { test } from "node:test";
import assert from "node:assert/strict";

test("서머타임 경계: 없는 시각(gap)·두 번 있는 시각(ambiguous)은 정확도 B 표시 대상(17_해외도시 ③)", async () => {
  const { dstBoundary, localToUtc } = await import("./time.ts");
  const L = (year: number, month: number, day: number, hour: number, minute: number) => ({ year, month, day, hour, minute });
  assert.equal(dstBoundary(L(2021, 3, 14, 2, 30), "America/New_York"), "gap");
  assert.equal(localToUtc(L(2021, 3, 14, 2, 30), "America/New_York").toISOString(), "2021-03-14T07:30:00.000Z"); // 문서 예시와 같음
  assert.equal(dstBoundary(L(2021, 11, 7, 1, 30), "America/New_York"), "ambiguous");
  assert.equal(localToUtc(L(2021, 11, 7, 1, 30), "America/New_York").toISOString(), "2021-11-07T05:30:00.000Z"); // 첫 번째(EDT)
  assert.equal(dstBoundary(L(1987, 5, 10, 2, 30), "Asia/Seoul"), "gap");
  assert.equal(dstBoundary(L(1987, 10, 11, 2, 30), "Asia/Seoul"), "ambiguous");
  assert.equal(dstBoundary(L(1990, 7, 15, 10, 0), "America/New_York"), null);
  assert.equal(dstBoundary(L(1996, 4, 1, 10, 17), "Asia/Seoul"), null);
});
