import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { pickTheme, themeTable } from "./theme2026.ts";
import type { AstroDb } from "./db.ts";

const db: AstroDb = JSON.parse(readFileSync(new URL("../../data/astro/db/astro_db_v1.4.json", import.meta.url), "utf8"));
const table = themeTable(db);
const z = { WEIGHT: 0, SHIFT: 0, GROWTH: 0, RELEASE: 0, REVIEW: 0 };

test("A12t: 주제 이름·어울리는 단어를 DB에서 읽는다", () => {
  assert.equal(table.WEIGHT.name, "무게·책임");
  assert.deepEqual(table.REVIEW.fitWords, ["배움", "멈춤"]);
  assert.deepEqual(table.CALM.fitWords, []);
});

test("RULE_PICK: 최고점 주제, 동점이면 순서가 앞선 쪽, 모두 40 미만이면 고른 흐름", () => {
  assert.deepEqual(pickTheme({ ...z, GROWTH: 55, RELEASE: 55 }, "버텨", table), { theme: "GROWTH", fit: false });
  assert.deepEqual(pickTheme({ ...z, REVIEW: 30 }, "멈춤", table), { theme: "CALM", fit: false });
});

test("RULE_FIT: 1위가 안 맞아도 2위가 맞고 1위의 80% 이상이면 2위·어울림", () => {
  assert.deepEqual(pickTheme({ ...z, WEIGHT: 100, SHIFT: 80 }, "변화", table), { theme: "SHIFT", fit: true });
  assert.deepEqual(pickTheme({ ...z, WEIGHT: 100, SHIFT: 75 }, "변화", table), { theme: "WEIGHT", fit: false });
  assert.deepEqual(pickTheme({ ...z, WEIGHT: 60 }, "버텨", table), { theme: "WEIGHT", fit: true });
});

test("A12c 표의 어울림/엇갈림 값이 A12t 어울리는 단어와 같다(DB 일관성)", () => {
  const byName = Object.values(table);
  for (const r of db.dbs.A12c.rows) {
    const fit = byName.find((t) => t.name === r.theme)!.fitWords.includes(r.word);
    assert.equal(r.fit, fit ? "어울림" : "엇갈림", r.id);
  }
});
