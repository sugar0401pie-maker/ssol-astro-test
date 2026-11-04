import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedOn, parseChoice, serializeChoice } from "./cookieConsent.ts";

test("한국어 화면은 지금 그대로(늘 켬)", () => {
  assert.equal(allowedOn("analytics", "/", null, false), true);
  assert.equal(allowedOn("ads", "/results/x/3", null, true), true);
});

test("영문 화면은 고르기 전엔 꺼짐, 고른 것만 켬", () => {
  assert.equal(allowedOn("analytics", "/en", null, false), false);
  assert.equal(allowedOn("ads", "/en/start", null, false), false);
  const c = { analytics: true, ads: false };
  assert.equal(allowedOn("analytics", "/en/start", c, false), true);
  assert.equal(allowedOn("ads", "/en/start", c, false), false);
});

test("Global Privacy Control이 켜져 있으면 광고 측정은 동의해도 끔", () => {
  assert.equal(allowedOn("ads", "/en", { analytics: true, ads: true }, true), false);
  assert.equal(allowedOn("analytics", "/en", { analytics: true, ads: true }, true), true);
});

test("저장 값 형식", () => {
  assert.equal(serializeChoice({ analytics: true, ads: false }), "a1d0");
  assert.deepEqual(parseChoice("a0d1"), { analytics: false, ads: true });
  assert.equal(parseChoice("yes"), null);
  assert.equal(parseChoice(undefined), null);
});
