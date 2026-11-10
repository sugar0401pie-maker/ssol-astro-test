import { test } from "node:test";
import assert from "node:assert/strict";
import { REPORT_HEADER, reportRows } from "./reportExport.ts";

const report = {
  generatedAt: "2026-11-08T03:00:00Z",
  sections: [
    { no: 4, title: "연말", source: "ai", summary: "요약", body: [{ t: "p", text: "문단" }, { t: "items", items: [{ title: "제목", text: "본문" }] }], tail: [{ t: "sub", text: "• 11월" }] },
    { no: 5, title: "2027", source: "db", summary: null, body: [{ t: "step", label: "준비", text: "단계" }], tail: [] },
  ],
  questions: { headline: "질문", items: ["하나?", "둘?"] },
  practices: [{ title: "실천", how: "방법" }],
  closing: "맺음말",
};

test("reportRows: 장마다 한 줄 + 질문·실천 한 줄", () => {
  const rows = reportRows({ id: "r1", lang: "en", answers: { q1: "a", q2: "b", q3: "c" } }, report);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].length, REPORT_HEADER.length);
  assert.deepEqual(rows[0].slice(0, 6), ["r1", "2026-11-08 12:00", "영문", "a", "b", "c"]);
  assert.equal(rows[0][8], "ai");
  assert.equal(rows[0][10], "문단\n\n제목 — 본문\n\n• 11월");
  assert.equal(rows[1][10], "준비: 단계");
  assert.equal(rows[2][7], "질문·실천·맺음말");
  assert.equal(rows[2][10], "· 하나?\n· 둘?\n\n실천 — 방법\n\n맺음말");
});

test("reportRows: 쓰는 중·비어 있음은 건너뜀", () => {
  assert.deepEqual(reportRows({ id: "r" }, { ...report, partial: true }), []);
  assert.deepEqual(reportRows({ id: "r" }, null), []);
});
