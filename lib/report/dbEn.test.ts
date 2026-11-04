import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildEnDb, LOOKUP_FIELDS } from "./dbEn.ts";
import { EN, KO, formatDateEn, ordinal } from "./lang.ts";

const ko = JSON.parse(fs.readFileSync(new URL("../../data/astro/db/astro_db_v1.4.json", import.meta.url), "utf8"));
const ov = JSON.parse(fs.readFileSync(new URL("../../data/astro/db/astro_db_en_overlay.json", import.meta.url), "utf8"));
const en = buildEnDb(ko, ov);

test("행을 찾는 칸은 한국어 그대로, 문장 칸은 영문", () => {
  const a12 = en.dbs.A12.rows.find((r: Record<string, string>) => r.word === "버텨");
  assert.ok(a12, "word 칸으로 찾을 수 있어야 함");
  assert.ok(!/[가-힣]/.test(a12.closing) && a12.closing.length > 0);
  const a5 = en.dbs.A5.rows[0];
  assert.match(a5.character, /[가-힣]/);
  assert.ok(a5.character_en);
});

test("번역 없는 한글 문장 칸은 비운다(영문 화면에 한국어가 새지 않게)", () => {
  for (const t of Object.values(en.dbs))
    for (const r of t.rows)
      for (const [k, v] of Object.entries(r))
        if (!LOOKUP_FIELDS.has(k) && !k.endsWith("_en") && typeof v === "string") assert.ok(!/[가-힣]/.test(v.replace(/\{\{?[^{}]*\}?\}/g, "")), `${t.db} ${r.id} ${k}: ${v.slice(0, 60)}`);
});

test("덮어쓰기 파일의 찾는 칸은 모두 _en으로만 들어온다", () => {
  for (const rows of Object.values(ov) as Array<Record<string, Record<string, string>>>)
    for (const cells of Object.values(rows)) for (const k of Object.keys(cells)) assert.ok(!LOOKUP_FIELDS.has(k), k);
});

test("영문 날짜·서수·하우스", () => {
  assert.equal(formatDateEn("2026-04-01"), "April 1");
  assert.equal(formatDateEn("1996-11-05", true), "November 5, 1996");
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  assert.equal(EN.house(10), "10th house");
  assert.equal(KO.house(10), "10하우스");
  assert.equal(EN.sign("물병자리"), "Aquarius");
});
