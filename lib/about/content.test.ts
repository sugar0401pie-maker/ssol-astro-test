import { test } from "node:test";
import assert from "node:assert/strict";
import * as c from "./content.ts";

const all = JSON.stringify(c) + JSON.stringify(c.aboutJsonLd());

test("근거 표기·확인 전 표시(⚠️·⏸)가 화면 글에 남지 않는다", () => {
  for (const bad of ["⚠️", "⏸", "자료", "쪽)", "(홈"]) assert.ok(!all.includes(bad), bad);
});

test("검색엔진 FAQ가 화면 FAQ와 글자까지 같다", () => {
  const ld = c.aboutJsonLd()["@graph"][1] as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
  assert.deepEqual(ld.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), c.FAQS.map((f) => [f.q, f.a]));
});

test("예측·운세·단정 표현 없음, 고지에 '예측 도구가 아니며'", () => {
  assert.ok(!/운세|반드시|예언/.test(all));
});

test("가격·별점 같은 구조화 데이터는 넣지 않는다", () => {
  const ld = JSON.stringify(c.aboutJsonLd());
  for (const k of ["offers", "aggregateRating", "Review"]) assert.ok(!ld.includes(k), k);
});
