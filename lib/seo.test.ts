import { test } from "node:test";
import assert from "node:assert/strict";
import { DISALLOW_PATHS, PUBLIC_PATHS, SEO_DESCRIPTION, SEO_TITLE } from "./seo.ts";

test("공개 경로는 막는 경로와 겹치지 않는다", () => {
  for (const p of PUBLIC_PATHS) for (const d of DISALLOW_PATHS) assert.ok(p === "/" || !p.startsWith(d), `${p} / ${d}`);
});

test("개인 결과·결제·로그인은 검색엔진에서 막는다", () => {
  for (const d of ["/results", "/checkout", "/login", "/api/"]) assert.ok((DISALLOW_PATHS as readonly string[]).includes(d));
});

test("검색 문구에 예측·운세 표현이 없다", () => {
  for (const t of [SEO_TITLE, SEO_DESCRIPTION]) assert.doesNotMatch(t, /운세|예언|미래를 (알|맞)|반드시/);
});
