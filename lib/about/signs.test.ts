import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import type { AstroDb } from "../report/db.ts";
import { SIGN_SLUGS } from "../seo.ts";
import { buildSignPages, signJsonLd, signsIndexJsonLd } from "./signs.ts";

const db: AstroDb = JSON.parse(readFileSync(new URL("../../data/astro/db/astro_db_v1.4.json", import.meta.url), "utf8"));
const pages = buildSignPages(db);

test("12별자리가 사이트맵 목록과 같은 순서·주소", () => {
  assert.deepEqual(pages.map((p) => p.slug), [...SIGN_SLUGS]);
});

test("모든 별자리에 소개·태양·달·상승궁 문장이 비지 않고, 그림 파일이 있다", () => {
  for (const p of pages) {
    for (const [k, v] of Object.entries({ ...p, ...p.sun, ...p.moon, risingLine: p.rising.line, risingText: p.rising.text }))
      if (typeof v === "string") assert.ok(v.length > 0, `${p.slug}.${k}`);
    assert.ok(existsSync(new URL(`../../public${p.art}`, import.meta.url)), p.art);
  }
});

test("예측·단정·운세 표현이 없고, 검수 메모는 화면에 나가지 않는다", () => {
  const all = JSON.stringify(pages);
  assert.ok(!/운세|반드시|예언|운명/.test(all));
  assert.ok(!all.includes("검수") && !all.includes("review"));
});

test("구조화 데이터에 가격·별점이 없다", () => {
  const ld = JSON.stringify([signsIndexJsonLd(pages), ...pages.map(signJsonLd)]);
  for (const k of ["offers", "aggregateRating", "Review", "FAQPage"]) assert.ok(!ld.includes(k), k);
});
