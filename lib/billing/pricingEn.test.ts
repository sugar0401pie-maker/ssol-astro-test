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

// 2026-11-06: 해외결제 상점 키 종류에 따라 결제위젯/결제창을 고른다(가짜 키 모양만 — 실제 키 아님)
test("tossKeyKind: 결제위젯 키 → widget, API 개별 연동 키 → api, 모르는 모양 → null", async () => {
  const { tossKeyKind } = await import("./pricingEn.ts");
  assert.equal(tossKeyKind("live_gck_EXAMPLE"), "widget");
  assert.equal(tossKeyKind("test_gck_EXAMPLE"), "widget");
  assert.equal(tossKeyKind("live_ck_EXAMPLE"), "api");
  assert.equal(tossKeyKind("test_ck_EXAMPLE"), "api");
  assert.equal(tossKeyKind(undefined), null);
  assert.equal(tossKeyKind("something"), null);
});
