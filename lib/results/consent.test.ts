import assert from "node:assert/strict";
import { test } from "node:test";
import { allConsented, CONSENT_ITEMS, consentItemsFor } from "./consent.ts";

test("필수 동의 4가지(만 14세·개인정보처리방침·약관·저장)를 모두 체크해야 넘어간다", () => {
  assert.equal(CONSENT_ITEMS.length, 4);
  assert.equal(allConsented({}), false);
  assert.equal(allConsented({ age: true, privacy: true, terms: true }), false);
  assert.equal(allConsented({ privacy: true, terms: true, store: true }), false);
  assert.equal(allConsented({ age: true, privacy: true, terms: true, store: false }), false);
  assert.equal(allConsented({ age: true, privacy: true, terms: true, store: true }), true);
});

test("저장 동의: 로그인 없이는 '임시 계정' 문구, 로그인하면 '입력 정보와 결과 저장' 문구(둘 다 필수)", () => {
  assert.deepEqual(consentItemsFor(true).map((c) => c.id), ["age", "privacy", "terms", "store"]);
  assert.deepEqual(consentItemsFor(false).map((c) => c.id), ["age", "privacy", "terms", "store"]);
  assert.match(consentItemsFor(true)[3].label, /임시 계정/);
  assert.match(consentItemsFor(false)[3].label, /입력 정보와 결과 저장/);
  assert.equal(allConsented({ age: true, privacy: true, terms: true }, false), false);
  assert.equal(allConsented({ age: true, privacy: true, terms: true, store: true }, false), true);
});
