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

test("주제별 하위 페이지는 사이트맵 공개 경로와 같고, 각자 FAQ가 있다", async () => {
  const { PUBLIC_PATHS, PAGE_UPDATED } = await import("../seo.ts");
  const subs = PUBLIC_PATHS.filter((p) => p.startsWith("/about/"));
  assert.deepEqual([...subs].sort(), c.SUB_PAGES.map((p) => `/about/${p.slug}`).sort());
  for (const p of PUBLIC_PATHS) assert.match(PAGE_UPDATED[p], /^\d{4}-\d{2}-\d{2}$/);
  for (const p of c.SUB_PAGES) assert.ok(c.faqsOf(p.groups).length > 0, p.slug);
  // 모든 FAQ가 어느 하위 페이지엔가 들어간다
  const covered = new Set(c.SUB_PAGES.flatMap((p) => c.faqsOf(p.groups).map((f) => f.q)));
  for (const f of c.FAQS) assert.ok(covered.has(f.q), f.q);
});

test("FAQPage 구조화 데이터는 /about 한 곳에만(하위 페이지는 웹페이지·이동 경로)", () => {
  for (const p of c.SUB_PAGES) assert.ok(!JSON.stringify(c.subPageJsonLd(p)).includes("FAQPage"), p.slug);
});

test("출생 정보 답은 처리방침대로 '출생차트에만, 통계 포함 그 밖의 용도 없음'", () => {
  const a = c.FAQS.find((f) => f.q.startsWith("생년월일과 출생지"))!.a;
  assert.ok(a.includes("데에만 쓰고") && a.includes("통계 분석을 포함한 그 밖의 용도로는 쓰지 않아요"));
});

test("고지는 '예측 도구가 아니며'로 시작", () => {
  assert.ok(c.ABOUT_DISCLAIMER.startsWith("쏠 아스트로 하우스는 예측 도구가 아니며"));
});
