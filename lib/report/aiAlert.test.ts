import { test } from "node:test";
import assert from "node:assert/strict";
import { alertRecipients, classifyAiError, DEFAULT_ALERT_EMAILS, shouldAlert, type AiFailureKind } from "./aiAlert.ts";

test("설정 문제만 알림 종류로 나눈다", () => {
  assert.equal(classifyAiError({ status: 401 }), "auth");
  assert.equal(classifyAiError({ status: 403 }), "auth");
  assert.equal(classifyAiError({ status: 429, code: "insufficient_quota" }), "quota");
  assert.equal(classifyAiError({ status: 429, code: "rate_limit_exceeded" }), "rate");
  assert.equal(classifyAiError({ status: 404 }), "model");
  assert.equal(classifyAiError({ status: 500 }), null);
  assert.equal(classifyAiError(new Error("timeout")), null);
  assert.equal(classifyAiError(null), null);
});

test("같은 종류는 한 시간에 한 번만", () => {
  const m = new Map<AiFailureKind, number>();
  assert.equal(shouldAlert(m, "auth", 0), true);
  assert.equal(shouldAlert(m, "auth", 10 * 60 * 1000), false);
  assert.equal(shouldAlert(m, "quota", 10 * 60 * 1000), true);
  assert.equal(shouldAlert(m, "auth", 61 * 60 * 1000), true);
});

test("알림 받는 곳: 기본 세 곳, 환경변수가 있으면 그 목록", () => {
  assert.deepEqual(alertRecipients(undefined), DEFAULT_ALERT_EMAILS);
  assert.equal(DEFAULT_ALERT_EMAILS.length, 3);
  assert.deepEqual(alertRecipients("a@x.com, b@y.com,bad"), ["a@x.com", "b@y.com"]);
});
