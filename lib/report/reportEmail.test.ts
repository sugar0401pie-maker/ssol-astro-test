import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReportEmail } from "./reportEmail.ts";

test("리포트 알림 메일: 별자리 카드 + 첫 장 링크 + 고지문, 본문은 넣지 않음, HTML 이스케이프", () => {
  const m = buildReportEmail({
    nickname: "지우<b>",
    sunSign: "양자리",
    oneLiner: "먼저 불을 붙이고 부딪히며 길을 여는 별자리예요.",
    imageUrl: "https://astro.ssolwellnesshouse.com/art/aries/kakao/art_02_type.jpg",
    resultUrl: "https://astro.ssolwellnesshouse.com/results/abc/1",
    disclaimer: "점성술은 예측이 아닌 자기성찰을 위한 이야기예요.",
  });
  assert.match(m.text, /results\/abc\/1/);
  assert.match(m.text, /먼저 불을 붙이고 부딪히며\n길을 여는 별자리예요\./);
  assert.match(m.text, /점성술은 예측이 아닌/);
  assert.match(m.text, /contact@ssolwellness\.com/);
  assert.ok(m.html.includes("지우&lt;b&gt;") && !m.html.includes("지우<b>"));
  assert.ok(m.html.includes("art_02_type.jpg"));
  assert.ok(m.html.includes("리포트 보러 가기"));
});
