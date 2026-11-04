import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { groupLists, type LegalBlock } from "./blocks.ts";

test("연속된 목록 줄은 하나로 묶인다", () => {
  const b: LegalBlock[] = [
    { type: "p", segs: [{ t: "a", b: false }] },
    { type: "li", segs: [{ t: "1", b: false }] },
    { type: "li", segs: [{ t: "2", b: false }] },
    { type: "p", segs: [{ t: "b", b: false }] },
  ];
  const g = groupLists(b);
  assert.equal(g.length, 3);
  assert.equal(g[1].type, "ul");
});

test("영문 개인정보처리방침은 제목으로 시작하고, 문서 안내·빈 표 줄·별표 굵게 표시가 없다", () => {
  const doc = JSON.parse(readFileSync(new URL("./privacy.json", import.meta.url), "utf8")) as LegalBlock[];
  const first = doc[0];
  assert.ok(first.type === "h2" && first.segs.map((s) => s.t).join("") === "Privacy Policy");
  const text = JSON.stringify(doc);
  assert.ok(!text.includes("This tab is"));
  assert.ok(!text.includes("**"));
  for (const b of doc) if (b.type === "table") for (const r of b.rows) assert.ok(r.some((c) => c.trim()));
});
