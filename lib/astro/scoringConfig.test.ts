// scoringConfig.ts의 값이 해석 DB C2(점수·가중치 설정)와 같은지 검사한다. C2나 설정 한쪽만 바뀌면 실패한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ASPECT_WEIGHT, DOMAIN_BOOST, FAST_TRANSIT_ORB, MOVEMENT_SCORE, MOVEMENT_THRESHOLDS, PLANET_WEIGHT, TARGET_WEIGHT,
  TEMPERAMENT_WEIGHT, TOP_EVENTS, WISH_SCORE, WISH_SIG_WEIGHT, WISH_THRESHOLDS, durationFactor,
} from "./scoringConfig.ts";
import { TRANSIT_ORB, NATAL_ORB, COMPETENCY_TIE_GAP } from "./constants.ts";

const db = JSON.parse(readFileSync(new URL("../../data/astro/db/astro_db_v1.3.json", import.meta.url), "utf8"));
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

test("C2 지속기간 보정·오브·가산·상위 개수", () => {
  assert.equal(durationFactor(29), num("W_021"));
  assert.equal(durationFactor(30), num("W_022"));
  assert.equal(durationFactor(89), num("W_022"));
  assert.equal(durationFactor(90), num("W_023"));
  assert.equal(TRANSIT_ORB.jupiter, num("W_024"));
  assert.equal(TRANSIT_ORB.saturn, num("W_024"));
  assert.equal(TRANSIT_ORB.uranus, num("W_025"));
  assert.equal(FAST_TRANSIT_ORB.mars, num("W_026"));
  assert.equal(FAST_TRANSIT_ORB.venus, num("W_027"));
  assert.equal(FAST_TRANSIT_ORB.mercury, num("W_027"));
  assert.equal(NATAL_ORB, num("W_028"));
  assert.equal(DOMAIN_BOOST, num("W_029"));
  assert.equal(TOP_EVENTS.eoy, num("W_030"));
  assert.equal(TOP_EVENTS.year2027, num("W_031"));
  assert.equal(COMPETENCY_TIE_GAP * 100, 3); // W_063 "< 3%p"
  assert.match(String(c2.get("W_063")), /3%p/);
});

test("C2 바람이 걸린 자리·이루어짐(v3)", () => {
  assert.equal(WISH_SIG_WEIGHT.ruler, num("W_033"));
  assert.equal(WISH_SIG_WEIGHT.inHouse, num("W_034"));
  assert.equal(WISH_SIG_WEIGHT.natural, num("W_035"));
  assert.equal(WISH_SIG_WEIGHT.moonAux, num("W_036"));
  assert.equal(WISH_SCORE.jupiterGood, num("W_037"));
  assert.equal(WISH_SCORE.jupiterHard, num("W_038"));
  assert.equal(WISH_SCORE.jupiterHousePass, num("W_039"));
  assert.equal(WISH_SCORE.saturnGood, num("W_040"));
  assert.equal(WISH_SCORE.saturnBad, num("W_041"));
  assert.equal(WISH_SCORE.saturnHousePass, num("W_042"));
  assert.equal(WISH_SCORE.extraPass, num("W_043"));
  assert.equal(WISH_SCORE.profection, num("W_044"));
  assert.equal(WISH_SCORE.sectDay, num("W_045"));
  assert.equal(WISH_SCORE.sectNight, num("W_046"));
  assert.equal(WISH_SCORE.changeBonus, num("W_047"));
});

test("C2 판정·경계·움직임·기질(v3)", () => {
  assert.match(String(c2.get("W_049")), /< 0/);
  assert.match(String(c2.get("W_050")), /0 이상 4 미만/);
  assert.equal(WISH_THRESHOLDS.low, 0);
  assert.equal(WISH_THRESHOLDS.high, num("W_051"));
  assert.match(String(c2.get("W_065")), /3 이상 4 미만/);
  assert.match(String(c2.get("W_066")), /0 이상 1 미만/);
  assert.match(String(c2.get("W_067")), /−1 이상 0 미만/);
  assert.equal(WISH_THRESHOLDS.edge, 1);
  assert.equal(MOVEMENT_SCORE.conj, num("W_053"));
  assert.equal(MOVEMENT_SCORE.hard, num("W_054"));
  assert.equal(MOVEMENT_SCORE.soft, num("W_055"));
  assert.equal(MOVEMENT_SCORE.saturnReturn, num("W_056"));
  assert.equal(MOVEMENT_SCORE.saturnAngularIngress, num("W_057"));
  assert.equal(MOVEMENT_THRESHOLDS.moving, num("W_058"));
  assert.equal(MOVEMENT_THRESHOLDS.calm, num("W_059"));
  assert.equal(String(c2.get("W_061")), `태양·달 ${TEMPERAMENT_WEIGHT.sun} · 수성·금성·화성 ${TEMPERAMENT_WEIGHT.mercury} · 목성·토성 ${TEMPERAMENT_WEIGHT.jupiter} · 상승궁 ${TEMPERAMENT_WEIGHT.asc}`);
});
