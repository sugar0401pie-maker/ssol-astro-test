import { test } from "node:test";
import assert from "node:assert/strict";
import { allPartsAi, usedDbFallback } from "./fallback.ts";

const rep = (results: string[], partial = false) => ({ partial, log: { parts: Object.fromEntries(results.map((r, i) => [`p${i}`, { result: r }])) } });

test("AI 없이 나간 파트가 있으면 다시 만들 대상", () => {
  assert.equal(usedDbFallback(rep(["ai", "db", "ai"])), true);
  assert.equal(usedDbFallback(rep(["ai", "ai", "ai"])), false);
  assert.equal(usedDbFallback(rep(["db"], true)), false);
  assert.equal(usedDbFallback(null), false);
  assert.equal(usedDbFallback({ sections: [] }), false);
});

test("다시 만든 리포트는 모든 파트가 AI일 때만 저장", () => {
  assert.equal(allPartsAi(rep(["ai", "ai", "ai"])), true);
  assert.equal(allPartsAi(rep(["ai", "db"])), false);
  assert.equal(allPartsAi({}), false);
});
