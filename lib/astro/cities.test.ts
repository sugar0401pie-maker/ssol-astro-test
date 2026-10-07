import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findCityById, searchCities, type CityRow } from "./cities.ts";

const rows: CityRow[] = JSON.parse(readFileSync(new URL("../../data/astro/cities.json", import.meta.url), "utf8"));

test("한글·영문으로 같은 도시를 찾고, 시간대 ID가 따라온다", () => {
  for (const q of ["로스앤젤레스", "los angeles", "Los Angeles", "엘에이"]) {
    const r = searchCities(rows, q)[0];
    assert.equal(r?.timeZone, "America/Los_Angeles", q);
  }
  assert.equal(searchCities(rows, "도쿄")[0].timeZone, "Asia/Tokyo");
  assert.equal(searchCities(rows, "tokyo")[0].timeZone, "Asia/Tokyo");
  assert.equal(searchCities(rows, "호찌민")[0].timeZone, "Asia/Ho_Chi_Minh");
  assert.equal(searchCities(rows, "saigon")[0].timeZone, "Asia/Ho_Chi_Minh");
});

test("표시는 '도시, 국가'이고 같은 이름이면 큰 도시가 먼저", () => {
  const paris = searchCities(rows, "paris")[0];
  assert.equal(paris.label, "파리, 프랑스");
  assert.equal(searchCities(rows, "뉴욕")[0].label, "뉴욕, 미국");
  assert.equal(searchCities(rows, "london")[0].label, "런던, 영국");
});

test("한국 도시는 목록에 없다(시·도 드롭다운 사용), 짧은 검색어는 빈 결과", () => {
  assert.ok(!rows.some((r) => r[3] === "KR"));
  assert.deepEqual(searchCities(rows, "a"), []);
  assert.deepEqual(searchCities(rows, "   "), []);
  assert.ok(searchCities(rows, "부산").every((r) => !r.label.endsWith("대한민국")));
});

test("모든 행의 시간대가 실제 IANA 시간대이고 좌표가 범위 안이다", () => {
  const bad = new Set<string>();
  for (const r of rows) {
    if (Math.abs(r[4]) > 90 || Math.abs(r[5]) > 180) bad.add(`coord ${r[0]}`);
    if (bad.has(r[6])) continue;
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: r[6] });
    } catch {
      bad.add(r[6]);
    }
  }
  assert.deepEqual([...bad], []);
});

test("id로 다시 찾기", () => {
  const la = searchCities(rows, "los angeles")[0];
  assert.deepEqual(findCityById(rows, la.id), la);
  assert.equal(findCityById(rows, -1), null);
});
