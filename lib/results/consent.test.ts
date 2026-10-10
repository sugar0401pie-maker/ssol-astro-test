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

test("임시 계정 동의는 로그인 없이(익명) 테스트할 때만 보이고 요구된다", () => {
  assert.deepEqual(consentItemsFor(true).map((c) => c.id), ["age", "privacy", "terms", "store"]);
  assert.deepEqual(consentItemsFor(false).map((c) => c.id), ["age", "privacy", "terms"]);
  assert.equal(allConsented({ age: true, privacy: true, terms: true }, false), true);
  assert.equal(allConsented({ age: true, privacy: true, terms: true }, true), false);
  assert.equal(allConsented({ privacy: true, terms: true }, false), false);
});
