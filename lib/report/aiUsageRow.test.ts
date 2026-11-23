import { test } from "node:test";
import assert from "node:assert/strict";
import { usageRow } from "./aiUsageRow.ts";

test("usageRow: 실제 토큰 숫자를 칸으로", () => {
  const r = usageRow({ feature: "paid_report", resultId: "6f1c2b3a-1111-4222-8333-444455556666", lang: "en" }, "B", {
    model: "gpt-x-2026", ok: true,
    usage: { input_tokens: 5000, output_tokens: 1200, input_tokens_details: { cached_tokens: 3000 }, output_tokens_details: { reasoning_tokens: 400 } },
  });
  assert.deepEqual(r, { site: "astro", feature: "paid_report", part: "B", result_id: "6f1c2b3a-1111-4222-8333-444455556666", lang: "en", model: "gpt-x-2026", input_tokens: 5000, cached_tokens: 3000, output_tokens: 1200, reasoning_tokens: 400, ok: true });
});

test("usageRow: 실패 호출·이상한 값은 0, 잘못된 결과 id는 비움", () => {
  const r = usageRow({ feature: "paid_report_redo", resultId: "not-a-uuid" }, "A", { model: null, ok: false, usage: { input_tokens: -3 } });
  assert.equal(r.result_id, null);
  assert.equal(r.input_tokens, 0);
  assert.equal(r.output_tokens, 0);
  assert.equal(r.ok, false);
  assert.equal(r.lang, "ko");
});
