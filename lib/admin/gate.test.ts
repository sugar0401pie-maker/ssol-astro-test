import { test } from "node:test";
import assert from "node:assert/strict";
import { GATE_TTL_MS, passwordMatches, recordFailedTry, signGate, tooManyTries, verifyGate } from "./gate.ts";

test("passwordMatches: 맞을 때만, 설정이 없으면 늘 거절", () => {
  assert.equal(passwordMatches("abc", "abc"), true);
  assert.equal(passwordMatches("abd", "abc"), false);
  assert.equal(passwordMatches("", "abc"), false);
  assert.equal(passwordMatches("abc", undefined), false);
  assert.equal(passwordMatches("abc", ""), false);
});

test("signGate·verifyGate: 계정·암호·만료에 묶임", () => {
  const now = 1_800_000_000_000;
  const t = signGate("u1", now, "pw", "pep");
  assert.equal(verifyGate(t, "u1", now + 1000, "pw", "pep"), true);
  assert.equal(verifyGate(t, "u2", now + 1000, "pw", "pep"), false); // 다른 계정
  assert.equal(verifyGate(t, "u1", now + 1000, "pw2", "pep"), false); // 암호 바뀜
  assert.equal(verifyGate(t, "u1", now + GATE_TTL_MS + 1, "pw", "pep"), false); // 만료
  assert.equal(verifyGate(t, "u1", now, undefined, "pep"), false); // 암호 설정 없음
  assert.equal(verifyGate("garbage", "u1", now, "pw", "pep"), false);
  assert.equal(verifyGate(undefined, "u1", now, "pw", "pep"), false);
  const [exp, sig] = t.split(".");
  assert.equal(verifyGate(`${Number(exp) + 1}.${sig}`, "u1", now, "pw", "pep"), false); // 만료 시각 조작
});

test("tooManyTries: 10분에 5번", () => {
  const now = 1_800_000_000_000;
  for (let i = 0; i < 5; i++) {
    assert.equal(tooManyTries("x", now), false);
    recordFailedTry("x", now);
  }
  assert.equal(tooManyTries("x", now), true);
  assert.equal(tooManyTries("x", now + 11 * 60 * 1000), false);
});
