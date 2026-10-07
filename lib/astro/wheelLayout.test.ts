// 출생차트 휠 배치 계산 테스트(docs/spec/02_디자인가이드.md 4장).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_ASPECT_LINES, layoutPlanets, lonToAngle, normDeg, pickAspectLines, polar,
  rotationLonFor, showsHouses, WHEEL_SIGNS, type PlanetInput,
} from "./wheelLayout.ts";
import { SIGNS } from "./constants.ts";
import type { NatalChart } from "./natal.ts";
import type { PointKey } from "./constants.ts";

const sample: NatalChart = JSON.parse(
  readFileSync(new URL("../../test/fixtures/sample-1996-04-01.json", import.meta.url), "utf8"),
);

const PLANETS: PointKey[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
/** 원 위 두 각도의 차(0~180). */
const angDist = (a: number, b: number) => {
  const d = normDeg(a - b);
  return Math.min(d, 360 - d);
};

test("A등급: ASC가 9시(180°), 황도대는 반시계 방향", () => {
  const rot = rotationLonFor(sample);
  assert.equal(rot, sample.planets.asc!.lon);
  assert.equal(lonToAngle(sample.planets.asc!.lon, rot), 180);
  // ASC보다 황경이 90° 큰 점은 6시(270°) — 지평선 아래로 반시계 방향.
  assert.ok(near(lonToAngle(sample.planets.asc!.lon + 90, rot), 270));
  // 이 차트의 MC는 위쪽 반원(화면 각도 0~180)에 있다.
  const mcAngle = lonToAngle(sample.planets.mc!.lon, rot);
  assert.ok(mcAngle > 0 && mcAngle < 180, `MC angle ${mcAngle}`);
});

test("C등급: 양자리 0°가 9시, 하우스·축은 숨김", () => {
  const c: NatalChart = { ...sample, accuracy: "C" };
  assert.equal(rotationLonFor(c), 0);
  assert.equal(lonToAngle(0, rotationLonFor(c)), 180);
  assert.equal(showsHouses(c), false);
  assert.equal(showsHouses(sample), true);
  // ASC 값이 빠진 B등급도 안전하게 양자리 기준·하우스 숨김.
  const { asc: _asc, ...rest } = sample.planets;
  void _asc;
  const noAsc: NatalChart = { ...sample, accuracy: "B", planets: rest };
  assert.equal(rotationLonFor(noAsc), 0);
  assert.equal(showsHouses(noAsc), false);
});

test("polar: 9시·12시·6시 좌표", () => {
  const left = polar(100, 100, 50, 180);
  assert.ok(near(left.x, 50) && near(left.y, 100));
  const top = polar(100, 100, 50, 90);
  assert.ok(near(top.x, 100) && near(top.y, 50));
  const bottom = polar(100, 100, 50, 270);
  assert.ok(near(bottom.x, 100) && near(bottom.y, 150));
});

test("layoutPlanets: 멀리 떨어진 행성은 제자리", () => {
  const out = layoutPlanets([{ key: "sun", lon: 10 }, { key: "moon", lon: 100 }, { key: "mars", lon: 200 }]);
  for (const p of out) {
    assert.equal(p.displaced, false);
    assert.equal(p.level, 0);
    assert.ok(near(p.displayLon, p.lon));
  }
});

test("layoutPlanets: 4° 안의 두 행성은 벌어지고, 평균 위치를 지키며, 실제 경도는 보존", () => {
  const out = layoutPlanets([{ key: "sun", lon: 50 }, { key: "moon", lon: 51 }]);
  const sun = out.find((p) => p.key === "sun")!;
  const moon = out.find((p) => p.key === "moon")!;
  assert.equal(sun.lon, 50);
  assert.equal(moon.lon, 51);
  assert.ok(angDist(sun.displayLon, moon.displayLon) >= 4 - 1e-9);
  assert.ok(near((sun.displayLon + moon.displayLon) / 2, 50.5));
  assert.ok(sun.displaced && moon.displaced);
  // 순서가 뒤집히지 않는다.
  assert.ok(sun.displayLon < moon.displayLon);
});

test("layoutPlanets: 양자리 0° 경계를 걸친 무리도 처리", () => {
  const out = layoutPlanets([{ key: "saturn", lon: 359 }, { key: "mars", lon: 1 }, { key: "sun", lon: 2 }]);
  const byKey = Object.fromEntries(out.map((p) => [p.key, p]));
  assert.ok(angDist(byKey.saturn.displayLon, byKey.mars.displayLon) >= 4 - 1e-9);
  assert.ok(angDist(byKey.mars.displayLon, byKey.sun.displayLon) >= 4 - 1e-9);
  for (const p of out) assert.ok(p.displayLon >= 0 && p.displayLon < 360);
});

test("layoutPlanets: 같은 줄 이웃은 rowSepDeg 이상, 가까운 이웃은 바깥 줄로 번갈아", () => {
  const pts: PlanetInput[] = PLANETS.map((k) => ({ key: k, lon: sample.planets[k]!.lon }));
  const opts = { minSepDeg: 9, rowSepDeg: 16 };
  const out = layoutPlanets(pts, opts);
  assert.equal(out.length, 10);
  // 모든 쌍: 화면 간격 ≥ minSep (스펙의 4°보다 넓게 줘도 겹침 없음)
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const d = angDist(out[i].displayLon, out[j].displayLon);
      assert.ok(d >= opts.minSepDeg - 1e-6, `${out[i].key}-${out[j].key} ${d}`);
      if (out[i].level === out[j].level) {
        assert.ok(d >= opts.rowSepDeg - 1e-6, `same row ${out[i].key}-${out[j].key} ${d}`);
      }
    }
  }
  // 이 샘플은 토성·화성·태양·수성이 양자리 0~16°에 몰려 있다 — 그 넷은 옮겨진다.
  const moved = out.filter((p) => p.displaced).map((p) => p.key).sort();
  for (const k of ["mars", "sun", "mercury"]) assert.ok(moved.includes(k as PointKey), `${k} moved`);
  // 멀리 혼자 있는 달은 그대로.
  const moon = out.find((p) => p.key === "moon")!;
  assert.equal(moon.displaced, false);
});

test("pickAspectLines: 합·ASC·MC 제외, 오브 작은 순 상위 8개, 조화/긴장 구분", () => {
  const lines = pickAspectLines(sample.aspects);
  assert.ok(lines.length <= DEFAULT_ASPECT_LINES);
  assert.equal(lines.length, DEFAULT_ASPECT_LINES);
  for (const l of lines) {
    assert.notEqual(l.aspect, "합");
    assert.ok(!["asc", "mc"].includes(l.a) && !["asc", "mc"].includes(l.b));
    assert.equal(l.tone, l.aspect === "육분" || l.aspect === "삼분" ? "harmony" : "tension");
  }
  for (let i = 1; i < lines.length; i++) assert.ok(lines[i - 1].orb <= lines[i].orb);
  // 가장 정확한 각도: 금성-해왕성 삼분 0.1° → 조화
  assert.deepEqual([lines[0].a, lines[0].b, lines[0].aspect, lines[0].tone], ["venus", "neptune", "삼분", "harmony"]);
  // 수성-목성 사각 0.4° → 긴장
  assert.ok(lines.some((l) => l.a === "mercury" && l.b === "jupiter" && l.tone === "tension"));
  // 빠진 8개 밖의 선은 모두 선택된 선보다 오브가 크거나 같다.
  const all = pickAspectLines(sample.aspects, true);
  const eligible = sample.aspects.filter(
    (a) => a.aspect !== "합" && ![a.a, a.b].some((k) => k === "asc" || k === "mc"),
  );
  assert.equal(all.length, eligible.length);
  assert.ok(all.length > DEFAULT_ASPECT_LINES);
  for (const l of all.slice(DEFAULT_ASPECT_LINES)) assert.ok(l.orb >= lines[lines.length - 1].orb);
});

test("pickAspectLines: 빈 입력", () => {
  assert.deepEqual(pickAspectLines([]), []);
  assert.deepEqual(pickAspectLines([{ a: "sun", b: "moon", aspect: "합", orb: 1 }]), []);
});

test("WHEEL_SIGNS는 엔진의 SIGNS와 같다", () => {
  assert.deepEqual([...WHEEL_SIGNS], [...SIGNS]);
});
