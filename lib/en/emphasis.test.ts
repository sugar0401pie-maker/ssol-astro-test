import { test } from "node:test";
import assert from "node:assert/strict";
import { isKeyParagraph, splitKeySentence } from "./emphasis.ts";

test("첫 문장만 떼어 낸다", () => {
  assert.deepEqual(splitKeySentence("Venus goes retrograde in your routines. Bring back small joys."), { key: "Venus goes retrograde in your routines.", rest: " Bring back small joys." });
  assert.deepEqual(splitKeySentence("One sentence paragraph that is long enough."), { key: "One sentence paragraph that is long enough.", rest: "" });
});

test("너무 짧거나 빈 문장은 굵게 하지 않는다", () => {
  assert.equal(splitKeySentence("Hi. There is more here."), null);
  assert.equal(splitKeySentence(""), null);
});

test("두 문단마다 하나", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(isKeyParagraph), [true, false, true, false, true]);
});
