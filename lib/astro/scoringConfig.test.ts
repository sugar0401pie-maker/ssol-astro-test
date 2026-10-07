// scoringConfig.ts의 값이 해석 DB C2(점수·가중치 설정)와 같은지 검사한다. C2나 설정 한쪽만 바뀌면 실패한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ASPECT_WEIGHT, DOMAIN_BOOST, FAST_TRANSIT_ORB, MILESTONE_SCORE, PLANET_WEIGHT, TARGET_WEIGHT, TOP_EVENTS,
  WISH_SCORE, WISH_THRESHOLD, durationFactor,
} from "./scoringConfig.ts";
import { TRANSIT_ORB, NATAL_ORB, COMPETENCY_TIE_GAP } from "./constants.ts";

const db = JSON.parse(readFileSync(new URL("../../data/astro/db/astro_db_v1.1.json", import.meta.url), "utf8"));
const c2 = new Map<string, string>(db.dbs.C2.rows.map((r: { id: string; value: string }) => [r.id, r.value]));
const num = (id: string) => Number(String(c2.get(id)).replace(/[^\d.\-−+]/g, "").replace("−", "-"));

test("C2 트랜짓 행성·출생 대상·각도 가중치", () => {
  const planets = ["jupiter", "saturn", "uranus", "neptune", "pluto", "mars", "venus", "mercury"] as const;
  planets.forEach((p, i) => assert.equal(PLANET_WEIGHT[p], num(`W_00${i + 1}`), p));
  const targets = ["sun", "moon", "asc", "mc", "mercury", "venus", "mars"] as const;
  targets.forEach((t, i) => assert.equal(TARGET_WEIGHT[t], num(`W_0${String(i + 9).padStart(2, "0")}`), t));
  const aspects = ["합", "충", "사각", "삼분", "육분"] as const;
  aspects.forEach((a, i) => assert.equal(ASPECT_WEIGHT[a], num(`W_0${16 + i}`), a));
});

test("C2 지속기간 보정·오브·가산·상위 개수·마일스톤", () => {
  assert.equal(durationFactor(29), num("W_021"));
  assert.equal(durationFactor(30), num("W_022"));
  assert.equal(durationFactor(89), num("W_022"));
  assert.equal(durationFactor(90), num("W_023"));
  assert.equal(TRANSIT_ORB.jupiter, num("W_024"));
  assert.equal(TRANSIT_ORB.saturn, num("W_024"));
  assert.equal(TRANSIT_ORB.uranus, num("W_025"));
  assert.equal(FAST_TRANSIT_ORB, num("W_026"));
  assert.equal(NATAL_ORB, num("W_027"));
  assert.equal(DOMAIN_BOOST, num("W_028"));
  assert.equal(TOP_EVENTS.eoy, num("W_029"));
  assert.equal(TOP_EVENTS.year2027, num("W_030"));
  assert.equal(MILESTONE_SCORE.saturn_return, num("W_032"));
  assert.equal(MILESTONE_SCORE.jupiter_return, num("W_033"));
  assert.equal(MILESTONE_SCORE.uranus_opposition, num("W_034"));
  assert.equal(MILESTONE_SCORE.neptune_square, num("W_034"));
  assert.equal(COMPETENCY_TIE_GAP * 100, 3); // W_044 "< 3%p"
});

test("C2 바람 지원도·판정", () => {
  assert.equal(WISH_SCORE.jupiterHousePass, num("W_035"));
  assert.equal(WISH_SCORE.jupiterHarmony, num("W_036"));
  assert.equal(WISH_SCORE.saturnHarmony, num("W_037"));
  assert.equal(WISH_SCORE.saturnHard, num("W_038"));
  assert.equal(WISH_SCORE.plutoHard, num("W_039"));
  assert.equal(WISH_THRESHOLD, num("W_040"));
  assert.equal(-WISH_THRESHOLD, num("W_041"));
});
