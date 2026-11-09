import { test } from "node:test";
import assert from "node:assert/strict";
import { amountLabel, csvCell, funnelRows, kstDayRange, kstStamp, loginMethodLabel, parseAdminDay, rate, toCsv, todayKst, type AdminStats } from "./stats.ts";

test("parseAdminDay", () => {
  assert.equal(parseAdminDay("2026-11-08"), "2026-11-08");
  assert.equal(parseAdminDay("2026-02-30"), null);
  assert.equal(parseAdminDay("11/08"), null);
  assert.equal(parseAdminDay(null), null);
});

test("kstDayRange·todayKst", () => {
  assert.deepEqual(kstDayRange("2026-11-08"), { start: "2026-11-07T15:00:00.000Z", end: "2026-11-08T15:00:00.000Z" });
  assert.equal(todayKst(new Date("2026-11-08T15:00:00Z")), "2026-11-09");
  assert.equal(todayKst(new Date("2026-11-08T14:59:00Z")), "2026-11-08");
});

test("rate·funnelRows", () => {
  assert.equal(rate(1, 3), 33.3);
  assert.equal(rate(5, 0), null);
  const p = (day: number, total: number) => ({ day, total });
  const s: AdminStats = { visitors: p(100, 1000), starts: p(50, 600), births: p(40, 500), results: p(30, 400), members: p(10, 100), paid: p(3, 20), krw: p(0, 0), usd_cents: p(0, 0) };
  const rows = funnelRows(s);
  assert.deepEqual(rows.map((r) => r.key), ["visitors", "starts", "births", "results", "paid"]);
  assert.equal(rows[0].dayRate, null);
  assert.equal(rows[1].dayRate, 50);
  assert.equal(rows[4].totalRate, 5);
});

test("csv: 수식 막기·따옴표·BOM", () => {
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell("-1"), "'-1");
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(1900), "1900");
  assert.ok(toCsv(["가", "나"], [[1, "x"]]).startsWith("﻿가,나\r\n1,x"));
});

test("loginMethodLabel·kstStamp·amountLabel", () => {
  assert.equal(loginMethodLabel("custom:naver", true), "네이버");
  assert.equal(loginMethodLabel("kakao", true), "카카오");
  assert.equal(loginMethodLabel(null, false), "비회원(로그인 안 함)");
  assert.equal(kstStamp("2026-11-08T15:30:00Z"), "2026-11-09 00:30");
  assert.equal(amountLabel(299, "USD"), "US$2.99");
  assert.equal(amountLabel(1900, null), "1900원");
});
