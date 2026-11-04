import { test } from "node:test";
import assert from "node:assert/strict";
import { EN_REPORT_PRICE_CENTS, centsToUsd, usdToCents } from "./pricingEn.ts";

test("영문 가격은 US$2.99 — 센트↔달러 변환이 정확하다", () => {
  assert.equal(EN_REPORT_PRICE_CENTS, 299);
  assert.equal(centsToUsd(299), 2.99);
  assert.equal(usdToCents(2.99), 299);
  assert.equal(usdToCents(Number("2.99")), 299);
  assert.equal(usdToCents(0.1 + 0.2), 30);
});
