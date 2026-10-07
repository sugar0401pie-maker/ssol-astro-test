// 엔진이 파이썬 프로토타입(docs/reference/07_엔진_프로토타입.py)과 같은 결과를 내는지 검증한다.
// 기준값은 scripts/gen_fixtures.py가 같은 라이브러리(astronomy-engine)의 파이썬판으로 만든 것.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { judgeCharacter, type CalibrationTable } from "./character.ts";
import { computeNatal } from "./natal.ts";
import { computeStationsAndIngress, computeTransits } from "./transits.ts";
import { localToUtc } from "./time.ts";
import { computeBirth } from "./birth.ts";
import { koreaRegion } from "./places.ts";

const json = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const ref: CalibrationTable = json("../../data/astro/calibration.json");
const sample = json("../../test/fixtures/sample-1996-04-01.json");
const cases: Array<{ utc: string; lat: number; lng: number; L: Record<string, number>; chart: typeof sample }> =
  json("../../test/fixtures/natal-cases.json");

const SAMPLE_UTC = new Date(Date.UTC(1996, 3, 1, 1, 17));
const GYEONGGI = { lat: 37.2893, lng: 127.0535 };

test("샘플(1996-04-01 10:17 KST 경기) 출생차트가 프로토타입 출력과 같다", () => {
  const { chart, L } = computeNatal(SAMPLE_UTC, GYEONGGI.lat, GYEONGGI.lng);
  assert.deepEqual(chart.planets, sample.planets);
  assert.deepEqual(chart.aspects, sample.aspects);
  assert.deepEqual(chart.elements, sample.elements);
  assert.equal(chart.accuracy, "A");
  const c = judgeCharacter(L, chart.elements, ref);
  const { runner_up: _r, ...rest } = c;
  void _r;
  assert.deepEqual(rest, sample.character);
});

test("샘플의 2026–2031 트랜짓·역행·별자리 이동이 프로토타입 출력과 같다", () => {
  const { L } = computeNatal(SAMPLE_UTC, GYEONGGI.lat, GYEONGGI.lng);
  assert.deepEqual(computeTransits(L, "2026-01-01", "2031-12-31"), sample.transits);
  const { stations, ingress } = computeStationsAndIngress(L, "2026-01-01", "2031-12-31");
  assert.deepEqual(stations, sample.stations);
  assert.deepEqual(ingress, sample.ingress);
});

test("무작위 30건(국내·해외, 1960–2005) 출생차트·캐릭터가 프로토타입과 같다", () => {
  for (const c of cases) {
    const { chart, L } = computeNatal(new Date(`${c.utc}Z`), c.lat, c.lng);
    for (const [k, v] of Object.entries(c.L)) {
      assert.ok(Math.abs((L as Record<string, number>)[k] - v) < 1e-6, `${c.utc} ${k}`);
    }
    assert.deepEqual(chart.planets, c.chart.planets, c.utc);
    assert.deepEqual(chart.aspects, c.chart.aspects, c.utc);
    const { runner_up: _r, ...rest } = judgeCharacter(L, chart.elements, ref);
    void _r;
    assert.deepEqual(rest, c.chart.character, c.utc);
  }
});

test("현지→UTC 변환이 한국의 과거 서머타임과 UTC+8:30 시절을 반영한다", () => {
  const tz = "Asia/Seoul";
  assert.equal(localToUtc({ year: 1996, month: 4, day: 1, hour: 10, minute: 17 }, tz).toISOString(), "1996-04-01T01:17:00.000Z");
  // 1955년 여름: 표준시 +8:30에 서머타임 +1 → +9:30
  assert.equal(localToUtc({ year: 1955, month: 6, day: 1, hour: 12, minute: 0 }, tz).toISOString(), "1955-06-01T02:30:00.000Z");
  // 1958년 겨울: +8:30
  assert.equal(localToUtc({ year: 1958, month: 1, day: 15, hour: 12, minute: 0 }, tz).toISOString(), "1958-01-15T03:30:00.000Z");
  // 1987년 여름 서머타임: +10
  assert.equal(localToUtc({ year: 1987, month: 7, day: 1, hour: 12, minute: 0 }, tz).toISOString(), "1987-07-01T02:00:00.000Z");
  // 해외: LA 서머타임(-7), 겨울(-8)
  assert.equal(localToUtc({ year: 2000, month: 7, day: 1, hour: 12, minute: 0 }, "America/Los_Angeles").toISOString(), "2000-07-01T19:00:00.000Z");
  assert.equal(localToUtc({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 }, "America/Los_Angeles").toISOString(), "2000-01-01T20:00:00.000Z");
});

test("computeBirth: 정확한 시간은 A등급, 저장값에 현지·시간대·UTC가 모두 남는다", () => {
  const place = koreaRegion("경기")!;
  const r = computeBirth({ year: 1996, month: 4, day: 1, time: { kind: "exact", hour: 10, minute: 17 }, place }, ref, { start: "2026-01-01", end: "2026-12-31" });
  assert.equal(r.accuracy, "A");
  assert.equal(r.stored.local, "1996-04-01T10:17");
  assert.equal(r.stored.timeZone, "Asia/Seoul");
  assert.equal(r.stored.utc, "1996-04-01T01:17:00.000Z");
  assert.equal(r.resolved?.character.name, "수달");
  assert.equal(r.resolved?.chart.planets.asc?.sign, sample.planets.asc.sign);
});

test("computeBirth: 모름(C)은 하우스·상승궁을 쓰지 않고, 후보가 갈리면 결과를 정하지 않는다", () => {
  const place = koreaRegion("서울")!;
  const r = computeBirth({ year: 1990, month: 5, day: 21, time: { kind: "unknown" }, place }, ref, { start: "2026-01-01", end: "2026-03-31" });
  assert.equal(r.accuracy, "C");
  assert.ok(r.candidates.length >= 1 && r.candidates.length <= 3);
  if (r.candidates.length > 1) {
    assert.equal(r.resolved, null);
    const picked = computeBirth({ year: 1990, month: 5, day: 21, time: { kind: "unknown", pick: r.candidates[1].pick }, place }, ref, { start: "2026-01-01", end: "2026-03-31" });
    assert.equal(picked.resolved?.character.name, r.candidates[1].name);
    assert.equal(picked.resolved?.chart.planets.asc, undefined);
    assert.equal(picked.resolved?.chart.planets.sun?.house, undefined);
    assert.ok(picked.resolved?.transits.every((e) => e.target !== "asc" && e.target !== "mc"));
  } else {
    assert.equal(r.resolved?.chart.planets.asc, undefined);
  }
});

test("computeBirth: 시간대(B)에서 고른 후보 시각이 구간 밖이면 거부한다", () => {
  const place = koreaRegion("부산")!;
  assert.throws(() =>
    computeBirth({ year: 1985, month: 11, day: 3, time: { kind: "band", band: "morning", pick: "13:00" }, place }, ref),
  );
  const r = computeBirth({ year: 1985, month: 11, day: 3, time: { kind: "band", band: "morning", pick: "09:30" }, place }, ref, { start: "2026-01-01", end: "2026-01-31" });
  assert.equal(r.accuracy, "B");
  assert.equal(r.resolved?.chart.accuracy, "B");
  assert.ok(r.resolved?.chart.planets.asc);
});

test("parseBirthRequest: 잘못된 날짜·시간·출생지·미래 날짜를 거부하고, 정상 입력은 통과시킨다", async () => {
  const { parseBirthRequest } = await import("./validate.ts");
  const now = new Date("2026-10-07T00:00:00Z");
  const LA = { label: "로스앤젤레스, 미국", lat: 34.0522, lng: -118.2437, timeZone: "America/Los_Angeles" };
  const opts = { now, findCity: (id: number) => (id === 5368361 ? LA : null) };
  const ok = { year: 1996, month: 4, day: 1, time: { kind: "exact", hour: 10, minute: 17 }, place: { region: "경기" } };
  assert.equal(parseBirthRequest(ok, opts).ok, true);
  assert.equal(parseBirthRequest({ ...ok, month: 2, day: 30 }, opts).ok, false);
  assert.equal(parseBirthRequest({ ...ok, year: 2027 }, opts).ok, false);
  assert.equal(parseBirthRequest({ ...ok, year: 1899 }, opts).ok, false);
  assert.equal(parseBirthRequest({ ...ok, time: { kind: "exact", hour: 24, minute: 0 } }, opts).ok, false);
  assert.equal(parseBirthRequest({ ...ok, time: { kind: "band", band: "noon" } }, opts).ok, false);
  assert.equal(parseBirthRequest({ ...ok, place: { region: "평양" } }, opts).ok, false);
  // 해외는 도시 id로만 — 브라우저가 보낸 좌표·시간대는 받지 않는다.
  assert.equal(parseBirthRequest({ ...ok, place: { label: "LA", lat: 34, lng: -118, timeZone: "America/Los_Angeles" } }, opts).ok, false);
  assert.equal(parseBirthRequest({ ...ok, place: { cityId: 1 } }, opts).ok, false);
  const la = parseBirthRequest({ ...ok, place: { cityId: 5368361 } }, opts);
  assert.ok(la.ok && la.input.place.timeZone === "America/Los_Angeles");
  assert.equal(parseBirthRequest({ ...ok, place: { cityId: 5368361 } }, { now }).ok, false);
  assert.equal(parseBirthRequest(null, opts).ok, false);
});
