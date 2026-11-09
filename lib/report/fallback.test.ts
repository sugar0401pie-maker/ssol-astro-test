import { test } from "node:test";
import assert from "node:assert/strict";
import { allPartsAi, generatedOnKstDay, parseDayParam, usedDbFallback } from "./fallback.ts";

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

test("generatedOnKstDay: 한국 날짜 기준", () => {
  assert.equal(generatedOnKstDay({ generatedAt: "2026-11-07T15:00:00.000Z" }, "2026-11-08"), true); // KST 11-08 00:00
  assert.equal(generatedOnKstDay({ generatedAt: "2026-11-08T14:59:59.000Z" }, "2026-11-08"), true); // KST 11-08 23:59
  assert.equal(generatedOnKstDay({ generatedAt: "2026-11-07T14:59:59.000Z" }, "2026-11-08"), false); // KST 11-07
  assert.equal(generatedOnKstDay({ generatedAt: "2026-11-08T15:00:00.000Z" }, "2026-11-08"), false); // KST 11-09
  assert.equal(generatedOnKstDay({}, "2026-11-08"), false);
  assert.equal(generatedOnKstDay({ generatedAt: "2026-11-08T03:00:00Z" }, "bad"), false);
});

test("parseDayParam", () => {
  assert.equal(parseDayParam(null), "");
  assert.equal(parseDayParam("2026-11-08"), "2026-11-08");
  assert.equal(parseDayParam("11/08"), null);
});
