import { test } from "node:test";
import assert from "node:assert/strict";
import { alternateStyle, candidateTypeOptions, findOption, tieTypeOptions, type CandidateLike } from "./typeChoice.ts";

const els = (불: number, 흙: number, 공기: number, 물: number) => ({ 불, 흙, 공기, 물 });

test("두 번째 방식(규칙 C): 태양 원소가 1등과 다르면 태양 원소, 같으면 2등 원소", () => {
  // 치즈케익 사례: 사자자리(불)인데 공기가 1등 → 다가가기
  assert.deepEqual(alternateStyle(els(3, 2, 5, 4), "공기", "사자자리"), { style: "다가가기", source: "sun" });
  // 불이 1등인 사자자리 → 2등 원소(흙) → 조율하기
  assert.deepEqual(alternateStyle(els(8, 5, 1, 0), "불", "사자자리"), { style: "조율하기", source: "second" });
});

test("역량 동점: 역량 2개 × 방식 2개 = 4개, 순서는 (역1·방1)(역2·방1)(역1·방2)(역2·방2)", () => {
  const o = tieTypeOptions({ competency: "선 지키기", runnerUp: "믿기", style: "조율하기", elements: els(3, 7, 0, 4), sunSign: "사자자리" });
  assert.deepEqual(o.map((x) => `${x.competency}/${x.style}/${x.source}`), ["선 지키기/조율하기/dominant", "믿기/조율하기/dominant", "선 지키기/다가가기/sun", "믿기/다가가기/sun"]);
});

const cand = (competency: CandidateLike["competency"], style: CandidateLike["style"], pick: string, runnerUp: CandidateLike["runnerUp"] = "믿기"): CandidateLike => ({ competency, style, pick, runnerUp, elements: els(3, 2, 5, 4), sunSign: "사자자리" });

test("시간 모름 후보: 치즈케익(기대기·회복하기, 둘 다 거리두기) → 거리두기 + 다가가기 × 두 역량", () => {
  const o = candidateTypeOptions([cand("기대기", "거리두기", "16:30"), cand("회복하기", "거리두기", "04:30")]);
  assert.equal(o.length, 4);
  assert.deepEqual(o.map((x) => `${x.competency}/${x.style}/${x.pick}`), ["기대기/거리두기/16:30", "회복하기/거리두기/04:30", "기대기/다가가기/16:30", "회복하기/다가가기/04:30"]);
});

test("후보끼리 방식이 이미 다르면 그 두 방식, 후보가 3개여도 4개까지, 역량이 하나면 2위 역량을 더함", () => {
  const o = candidateTypeOptions([cand("기대기", "거리두기", "16:30"), cand("기대기", "맞춰주기", "02:00", "말하기"), cand("회복하기", "거리두기", "08:00")]);
  assert.equal(o.length, 4);
  assert.deepEqual([...new Set(o.map((x) => x.style))], ["거리두기", "맞춰주기"]);
  assert.equal(o.find((x) => x.style === "맞춰주기")!.source, "time");
  assert.deepEqual([...new Set(o.map((x) => x.competency))], ["기대기", "회복하기"]);
  const one = candidateTypeOptions([cand("기대기", "거리두기", "16:30", "말하기"), cand("기대기", "맞춰주기", "02:00")]);
  assert.deepEqual([...new Set(one.map((x) => x.competency))], ["기대기", "말하기"]);
  assert.deepEqual(candidateTypeOptions([cand("기대기", "거리두기", "16:30")]), []);
});

test("고른 유형은 선택지 안에 있을 때만 받아들인다", () => {
  const o = tieTypeOptions({ competency: "기대기", runnerUp: "회복하기", style: "거리두기", elements: els(3, 2, 5, 4), sunSign: "사자자리" });
  assert.ok(findOption(o, { competency: "회복하기", style: "다가가기" }));
  assert.equal(findOption(o, { competency: "믿기", style: "다가가기" }), undefined);
  assert.equal(findOption(o, undefined), undefined);
});

import { readFileSync } from "node:fs";
import { computeBirth } from "./birth.ts";
import type { CalibrationTable } from "./character.ts";
import { whyWithSource } from "../report/freeResult.ts";

const ref: CalibrationTable = JSON.parse(readFileSync(new URL("../../data/astro/calibration.json", import.meta.url), "utf8"));
const seoul = { lat: 37.5663, lng: 126.9779, label: "서울", timeZone: "Asia/Seoul" };
const period = { start: "2026-01-01", end: "2026-01-01" };

test("치즈케익 사례(1994-08-02 서울, 시간 모름): 4개 선택지, 다가가기를 고르면 태양 원소 출처로 저장", () => {
  const base = { year: 1994, month: 8, day: 2, place: seoul };
  const r = computeBirth({ ...base, time: { kind: "unknown" } }, ref, period);
  assert.equal(r.resolved, null);
  assert.deepEqual(r.options?.map((o) => `${o.competency}/${o.style}`), ["기대기/거리두기", "회복하기/거리두기", "기대기/다가가기", "회복하기/다가가기"]);
  const opt = r.options![3];
  const picked = computeBirth({ ...base, time: { kind: "unknown", pick: opt.pick }, typePick: { competency: "회복하기", style: "다가가기" } }, ref, period);
  const c = picked.resolved!.character;
  assert.equal(c.competency, "회복하기");
  assert.equal(c.style, "다가가기");
  assert.equal(c.style_source, "sun");
  assert.equal(c.strong_element, "공기");
  assert.equal(c.options?.length, 4); // 다시 바꿀 수 있게 선택지는 남는다
  // 선택지 밖의 유형은 무시(판정 그대로)
  const bad = computeBirth({ ...base, time: { kind: "unknown", pick: opt.pick }, typePick: { competency: "믿기", style: "다가가기" } }, ref, period);
  assert.notEqual(bad.resolved!.character.competency, "믿기");
});

test("'왜 이 유형인가' 마지막 문장: 1등 원소가 아닌 방식을 고르면 출처에 맞게 바뀐다", () => {
  const why = "…먼저 손을 뻗어 화해를 청하는 것은, 차트에서 불의 기운이 가장 강하기 때문입니다.";
  assert.equal(whyWithSource(why, { style: "다가가기" }), why);
  assert.match(whyWithSource(why, { style: "다가가기", style_source: "sun", strong_element: "공기" }), /가장 강한 기운은 공기지만, 태양이 놓인 불의 기운이 마음이 흔들리는 순간에 앞으로 나오기 때문입니다\.$/);
  assert.match(whyWithSource(why, { style: "다가가기", style_source: "second", strong_element: "흙" }), /흙 다음으로 강한 불의 기운이/);
  assert.match(whyWithSource(why.replace("입니다", "이에요"), { style: "다가가기", style_source: "time", strong_element: "물" }), /달의 자리가 바뀌어, 하루 중 어느 때는 불의 기운이 가장 강해지기 때문이에요\.$/);
  assert.match(whyWithSource(why, { style: "다가가기", style_source: "sun", strong_element: "물" }), /가장 강한 기운은 물이지만/);
});
