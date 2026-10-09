import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import type { AstroDb } from "./db.ts";
import { a12Variant, a13Variant, b11, fillSummary, hashPick } from "./variants.ts";

const db: AstroDb = JSON.parse(readFileSync(new URL("../../data/astro/db/astro_db_v1.2.json", import.meta.url), "utf8"));

test("FNV-1a 해시: 같은 열쇠는 늘 같은 값, 범위 안", () => {
  assert.equal(hashPick("1996|4|1", 5, "A12IM버텨"), hashPick("1996|4|1", 5, "A12IM버텨"));
  for (let i = 0; i < 50; i++) assert.ok(hashPick(`k${i}`, 5, "s") < 5);
  // 32비트 FNV-1a 알려진 값: "a" → 0xe40c292c. 열쇠 "" + "#" + 솔트이므로 직접 계산과 비교
  const fnv = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  assert.equal(fnv("a"), 0xe40c292c);
  assert.equal(hashPick("x", 1000003, "y"), fnv("x#y") % 1000003);
});

test("A12·A13 표현: 칸마다 5개 중 하나, 같은 사람이면 같은 문장, 사람마다 갈린다", () => {
  const a12 = db.dbs.A12.rows.find((r) => r.word === "버텨")!;
  const pool = new Set<string>();
  for (let i = 0; i < 60; i++) pool.add(a12Variant(db, a12, "intro_match", `person${i}`));
  assert.equal(pool.size, 5);
  assert.equal(a12Variant(db, a12, "closing", "p1"), a12Variant(db, a12, "closing", "p1"));
  const a13 = db.dbs.A13.rows.find((r) => r.wish === "안정" && r.level === "활짝 열리는 해(순풍)")!;
  const p13 = new Set<string>();
  for (let i = 0; i < 60; i++) p13.add(a13Variant(db, a13, `person${i}`));
  assert.equal(p13.size, 5);
});

test("B11 요약 틀: 조사까지 채우고, 빠진 값이 있으면 null", () => {
  assert.equal(
    fillSummary(b11(db, "SUM_2027"), { 닉네임: "지우", 바람: "안정", 판정: "활짝 열리는 해(순풍)", 테마: "기반을 넓히는 해" }),
    "지우님의 2027년은 안정이 활짝 열리는 해(순풍)이고, 기반을 넓히는 해예요.",
  );
  assert.equal(fillSummary(b11(db, "SUM_2027"), { 닉네임: "지우" }), null);
});
