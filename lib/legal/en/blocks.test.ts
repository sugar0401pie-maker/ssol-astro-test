import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EN_LEGAL_PAGES, groupLists, type LegalBlock } from "./blocks.ts";

test("연속된 목록 줄은 하나로 묶이고, 점 목록·번호 목록은 따로", () => {
  const s = (t: string) => [{ t, b: false }];
  const g = groupLists([
    { type: "p", segs: s("a") },
    { type: "li", segs: s("1") },
    { type: "li", segs: s("2") },
    { type: "oli", segs: s("x") },
  ]);
  assert.deepEqual(g.map((b) => b.type), ["p", "ul", "ol"]);
});

test("정책 7개 모두 내용 파일이 있고, 제목으로 시작하며, ** 표시·빈 표 줄이 남지 않았다", () => {
  assert.equal(EN_LEGAL_PAGES.length, 7);
  for (const p of EN_LEGAL_PAGES) {
    const doc = JSON.parse(readFileSync(new URL(`./${p.slug}.json`, import.meta.url), "utf8")) as LegalBlock[];
    assert.equal(doc[0].type, "h2", p.slug);
    const text = JSON.stringify(doc);
    assert.ok(!text.includes("**"), p.slug);
    assert.match(text, /Effective date/, p.slug);
    for (const b of doc) if (b.type === "table") for (const r of b.rows) assert.ok(r.some((c) => c.trim()), p.slug);
  }
});
