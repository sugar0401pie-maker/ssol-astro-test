import { test } from "node:test";
import assert from "node:assert/strict";
import { PAYWALL_REVIEWS, shuffled } from "./paywallReviews.ts";
import { REPORT_PRICE } from "../billing/pricing.ts";

test("후기 20개, '타로' 글자 없음, 가격은 지금 가격", () => {
  assert.equal(PAYWALL_REVIEWS.length, 20);
  for (const r of PAYWALL_REVIEWS) assert.ok(!r.includes("타로"), r);
  assert.ok(PAYWALL_REVIEWS.some((r) => r.includes(`${REPORT_PRICE.toLocaleString("ko-KR")}원`)));
  assert.ok(!PAYWALL_REVIEWS.some((r) => r.includes("990원")));
});

test("섞어도 같은 후기들", () => {
  let s = 1;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  assert.deepEqual([...shuffled(PAYWALL_REVIEWS, rand)].sort(), [...PAYWALL_REVIEWS].sort());
});
