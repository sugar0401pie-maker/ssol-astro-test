import { test } from "node:test";
import assert from "node:assert/strict";
import { guestExpiry, hashGuestToken, isGuestToken } from "./guest.ts";

test("비회원 열쇠: 모양 검사·해시(열쇠 자체는 저장하지 않음)", () => {
  const t = "A".repeat(43);
  assert.equal(isGuestToken(t), true);
  assert.equal(isGuestToken("short"), false);
  assert.equal(isGuestToken(`${"A".repeat(42)}!`), false);
  assert.equal(isGuestToken(undefined), false);
  assert.match(hashGuestToken(t), /^[0-9a-f]{64}$/);
  assert.notEqual(hashGuestToken(t), t);
  assert.notEqual(hashGuestToken(t), hashGuestToken("B".repeat(43)));
});

test("비회원(임시 계정) 결과 보관 기한: 30일, 결제하면 결제일로부터 30일(2026-10-10 확정)", () => {
  const now = new Date("2026-10-08T00:00:00Z");
  assert.equal(guestExpiry(now, false), "2026-11-07T00:00:00.000Z");
  assert.equal(guestExpiry(now, true), "2026-11-07T00:00:00.000Z");
});
