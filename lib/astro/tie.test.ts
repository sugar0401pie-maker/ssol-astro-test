// 역량 동점 확인(마스터스펙 6-3): 1·2위 차이 3%p 미만이면 사용자가 고르고, 고른 값만 반영한다(무작위 금지).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeBirth, type BirthInput } from "./birth.ts";
import { withCompetencyPick, type CalibrationTable, type CharacterResult } from "./character.ts";

const ref: CalibrationTable = JSON.parse(readFileSync(new URL("../../data/astro/calibration.json", import.meta.url), "utf8"));
const base: CharacterResult = {
  name: "수달", competency: "기대기", style: "다가가기", percentiles: {} as CharacterResult["percentiles"],
  needs_confirm: true, element_tie: false, runner_up: "말하기",
};

test("withCompetencyPick: 1·2위 중 고른 쪽만 받아들인다", () => {
  const second = withCompetencyPick(base, "말하기");
  assert.equal(second.competency, "말하기");
  assert.equal(second.name, "물개"); // 말하기 × 다가가기
  assert.equal(second.needs_confirm, true); // 결과 화면에서 다시 바꿀 수 있게 그대로
  assert.equal(withCompetencyPick(base, "기대기").competency, "기대기");
  assert.equal(withCompetencyPick(base, "회복하기"), base); // 1·2위가 아닌 값은 무시
  assert.equal(withCompetencyPick(base, undefined), base);
  assert.equal(withCompetencyPick({ ...base, needs_confirm: false }, "말하기").competency, "기대기"); // 동점이 아니면 무시
});

test("computeBirth: 동점인 출생은 고른 역량으로 결과가 정해진다", () => {
  const place = { label: "서울", lat: 37.5663, lng: 126.9779, timeZone: "Asia/Seoul" };
  let found: BirthInput | null = null;
  outer: for (let y = 1980; y < 2000; y++)
    for (let d = 1; d <= 28; d += 3) {
      const input: BirthInput = { year: y, month: 6, day: d, time: { kind: "exact", hour: 9, minute: 0 }, place };
      if (computeBirth(input, ref, { start: "2026-01-01", end: "2026-01-01" }).resolved?.character.needs_confirm) {
        found = input;
        break outer;
      }
    }
  assert.ok(found, "동점 사례를 찾지 못함");
  const c = computeBirth(found, ref, { start: "2026-01-01", end: "2026-01-01" }).resolved!.character;
  const picked = computeBirth({ ...found, competencyPick: c.runner_up }, ref, { start: "2026-01-01", end: "2026-01-01" }).resolved!.character;
  assert.equal(picked.competency, c.runner_up);
  assert.equal(picked.needs_confirm, true);
  assert.equal(picked.runner_up, c.competency);
});
