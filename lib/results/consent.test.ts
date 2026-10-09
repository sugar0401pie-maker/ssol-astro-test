import assert from "node:assert/strict";
import { test } from "node:test";
import { allConsented, CONSENT_ITEMS } from "./consent.ts";

test("필수 동의 3가지(개인정보처리방침·약관·저장)를 모두 체크해야 넘어간다", () => {
  assert.equal(CONSENT_ITEMS.length, 3);
  assert.equal(allConsented({}), false);
  assert.equal(allConsented({ privacy: true, terms: true }), false);
  assert.equal(allConsented({ privacy: true, terms: true, store: false }), false);
  assert.equal(allConsented({ privacy: true, terms: true, store: true }), true);
});
