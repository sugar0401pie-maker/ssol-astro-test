import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReportEmail } from "./reportEmail.ts";

test("리포트 메일: 섹션·질문·실천·고지문·문의 메일, HTML은 이스케이프", () => {
  const m = buildReportEmail({
    nickname: "지우",
    resultUrl: "https://astro.ssolwellnesshouse.com/results/x/4",
    disclaimer: "점성술은 예측이 아닌 자기성찰을 위한 이야기예요.",
    report: {
      sections: [
        { no: 5, title: "2027년", summary: "요약<b>", body: [{ t: "p", text: "본문" }], tail: [{ t: "step", label: "준비", text: "정하지 말고" }] },
        { no: 4, title: "연말", summary: null, body: [{ t: "head", text: "• 조심할 세 가지" }], tail: [] },
      ],
      questions: { headline: "", items: ["무엇을 바라나요?"] },
      practices: [{ title: "산책", how: "10분 걷기" }],
      closing: "고마워요.",
    },
  });
  assert.match(m.subject, /지우님의 별 리포트/);
  assert.ok(m.text.indexOf("4. 연말") < m.text.indexOf("5. 2027년"));
  assert.match(m.text, /점성술은 예측이 아닌/);
  assert.match(m.text, /contact@ssolwellness\.com/);
  assert.ok(m.html.includes("요약&lt;b&gt;") && !m.html.includes("요약<b>"));
  assert.match(m.text, /· 준비 — 정하지 말고/);
});
