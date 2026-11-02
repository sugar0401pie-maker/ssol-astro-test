import { test } from "node:test";
import assert from "node:assert/strict";
import { SIGNS, signIndex } from "./constants.ts";
import { lunations, postShadowEnd, preShadowStart } from "./yearEnd.ts";

const near = (a: string | null, b: string, days = 1) => {
  assert.ok(a, "날짜가 있어야 함");
  assert.ok(Math.abs(Date.parse(a!) - Date.parse(b)) <= days * 86_400_000, `${a} ≈ ${b}`);
};

test("2026 연말 역행 뒤 정리·화성 역행 앞 준비(기획 v0.3 메모의 날짜와 하루 안)", () => {
  near(postShadowEnd("venus", "2026-10-04", "2026-11-14"), "2026-12-16");
  near(postShadowEnd("mercury", "2026-10-25", "2026-11-14"), "2026-11-30");
  near(preShadowStart("mars", "2027-01-11", "2027-04-02"), "2026-11-05");
});

test("2026 11~12월 초승달·보름달(한국 날짜·별자리)", () => {
  const l = lunations("2026-11-01", "2026-12-31").map((x) => `${x.date} ${x.kind} ${SIGNS[signIndex(x.lon)]}`);
  assert.deepEqual(l, ["2026-11-09 new 전갈자리", "2026-11-24 full 쌍둥이자리", "2026-12-09 new 사수자리", "2026-12-24 full 게자리"]);
  assert.deepEqual(lunations("2026-11-10", "2026-11-30").map((x) => x.date), ["2026-11-24"]);
});
