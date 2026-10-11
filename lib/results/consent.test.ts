import assert from "node:assert/strict";
import { test } from "node:test";
import { allConsented, CONSENT_ITEMS, consentItemsFor, GUEST_TERMS_NOTE } from "./consent.ts";

test("필수 동의(만 14세·개인정보처리방침·약관)를 모두 체크해야 넘어간다", () => {
  assert.equal(CONSENT_ITEMS.length, 3);
  assert.equal(allConsented({}), false);
  assert.equal(allConsented({ privacy: true, terms: true }), false);
  assert.equal(allConsented({ age: true, privacy: true, terms: true }), true);
});

test("로그인 없이: 임시 계정 체크를 따로 두지 않고 이용약관 아래 안내만(owner 2026-10-11), 로그인하면 '입력 정보와 결과 저장' 필수", () => {
  assert.deepEqual(consentItemsFor(true).map((c) => c.id), ["age", "privacy", "terms"]);
  assert.equal(consentItemsFor(true)[2].note, GUEST_TERMS_NOTE);
  assert.match(GUEST_TERMS_NOTE, /임시 계정/);
  assert.match(GUEST_TERMS_NOTE, /30일/);
  assert.deepEqual(consentItemsFor(false).map((c) => c.id), ["age", "privacy", "terms", "store"]);
  assert.match(consentItemsFor(false)[3].label, /입력 정보와 결과 저장/);
  assert.equal(allConsented({ age: true, privacy: true, terms: true }, false), false);
  assert.equal(allConsented({ age: true, privacy: true, terms: true, store: true }, false), true);
});
