import { test } from "node:test";
import assert from "node:assert/strict";
import { alternateStyle, candidateTypeOptions, findOption, secondElement, tieTypeOptions, type CandidateLike } from "./typeChoice.ts";

const els = (불: number, 흙: number, 공기: number, 물: number) => ({ 불, 흙, 공기, 물 });

test("두 번째 방식(규칙 D): 1등 원소의 반대 그룹 중 점수가 높은 원소, 근거는 0점→태양→2등→그 밖", () => {
  // 치즈케익: 공기 5·물 4·불 3·흙 2, 사자자리 → 반대 그룹 불 3 > 흙 2 → 다가가기, 태양 원소라 SUN
  assert.deepEqual(alternateStyle(els(3, 2, 5, 4), "공기", "사자자리"), { style: "다가가기", source: "sun" });
  // C 규칙이었다면 태양 원소(불)와 같은 그룹인 흙이 1등일 때도 '꺼내는 쪽'끼리 묶였다 → D는 반대 그룹(공기·물)에서 고른다
  // 흙 7·물 4·불 3·공기 0, 사자자리 → 물(2등) → 맞춰주기, SECOND
  assert.deepEqual(alternateStyle(els(3, 7, 0, 4), "흙", "사자자리"), { style: "맞춰주기", source: "second" });
  // 물 6·불 5·흙 3·공기 2, 물고기자리(물) → 반대 그룹 불 5 > 흙 3 → 다가가기, 불이 2등 → SECOND
  assert.deepEqual(alternateStyle(els(5, 3, 2, 6), "물", "물고기자리"), { style: "다가가기", source: "second" });
  // 물 6·공기 5·흙 3·불 1, 게자리 → 흙 → 조율하기, 태양(물)도 2등(공기)도 아님 → OTHER
  assert.deepEqual(alternateStyle(els(1, 3, 5, 6), "물", "게자리"), { style: "조율하기", source: "other" });
  // 반대 그룹이 둘 다 0점 → 정해진 짝(공기↔불), ZERO
  assert.deepEqual(alternateStyle(els(0, 0, 9, 5), "공기", "쌍둥이자리"), { style: "다가가기", source: "zero" });
});

test("규칙 D 동점: 달 원소 → 태양 원소 → 정해진 짝", () => {
  // 공기 1등, 불 3 = 흙 3
  assert.deepEqual(secondElement(els(3, 3, 6, 2), "공기", "흙", "불"), { el: "흙", zero: false }); // 달이 흙
  assert.deepEqual(secondElement(els(3, 3, 6, 2), "공기", "물", "불"), { el: "불", zero: false }); // 달은 반대 그룹 밖 → 태양 불
  assert.deepEqual(secondElement(els(3, 3, 6, 2), "공기", "물", "공기"), { el: "불", zero: false }); // 둘 다 밖 → 짝(공기↔불)
  assert.deepEqual(secondElement(els(3, 3, 2, 6), "물", null, "물"), { el: "흙", zero: false }); // 달 모름·태양 밖 → 짝(물↔흙)
});

test("규칙 D는 두 방식이 늘 서로 다른 그룹(꺼내는 쪽·간직하는 쪽)", () => {
  const group = (s: string) => (s === "다가가기" || s === "조율하기" ? "out" : "in");
  const STY = { 불: "다가가기", 흙: "조율하기", 공기: "거리두기", 물: "맞춰주기" } as const;
  for (let n = 0; n < 500; n++) {
    const r = () => Math.floor(Math.random() * 8);
    const e = els(r(), r(), r(), r());
    const dom = (Object.keys(e) as Array<keyof typeof e>).reduce((a, b) => (e[b] > e[a] ? b : a));
    const alt = alternateStyle(e, dom, ["양자리", "황소자리", "쌍둥이자리", "게자리"][n % 4], "처녀자리");
    assert.notEqual(group(alt.style), group(STY[dom]));
  }
});

test("역량 동점: 역량 2개 × 방식 2개 = 4개, 순서는 (역1·방1)(역2·방1)(역1·방2)(역2·방2)", () => {
  const o = tieTypeOptions({ competency: "선 지키기", runnerUp: "믿기", style: "조율하기", elements: els(3, 7, 0, 4), sunSign: "사자자리" });
  assert.deepEqual(o.map((x) => `${x.competency}/${x.style}/${x.source}`), ["선 지키기/조율하기/dominant", "믿기/조율하기/dominant", "선 지키기/맞춰주기/second", "믿기/맞춰주기/second"]);
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
import { STYLE_WHY_TEMPLATES, whyWithSource } from "../report/freeResult.ts";

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
  const why2 = "…맞추는 것은, 차트에서 흙의 기운이 가장 강하기 때문입니다.";
  assert.equal(
    whyWithSource(why2, { style: "조율하기", style_source: "other", strong_element: "물" }),
    "…맞추는 것은, 차트에서 가장 강한 기운은 물이지만, 함께 자리한 흙의 기운이 마음이 흔들리는 순간에 앞으로 나오기 때문입니다.",
  );
  assert.equal(
    whyWithSource(why, { style: "다가가기", style_source: "zero", strong_element: "공기" }),
    "…먼저 손을 뻗어 화해를 청하는 것은, 차트에는 불의 기운이 거의 없지만, 마음이 흔들리는 순간에는 부족한 쪽을 채우려는 마음이 앞으로 나오기 때문입니다.",
  );
});

test("근거 문장 표(A5c)는 owner 파일의 문장과 같다", () => {
  const doc = JSON.parse(readFileSync(new URL("../../docs/spec/11_해석DB/변경_A5c_근거문장.json", import.meta.url), "utf8")) as { rows: Array<{ id: string; text: string }> };
  const key = { STYLE_WHY_TIME: "time", STYLE_WHY_SUN: "sun", STYLE_WHY_SECOND: "second", STYLE_WHY_OTHER: "other", STYLE_WHY_ZERO: "zero" } as const;
  assert.equal(doc.rows.length, 5);
  for (const r of doc.rows) assert.equal(`${STYLE_WHY_TEMPLATES[key[r.id as keyof typeof key]]}입니다.`, r.text, r.id);
});

test("규칙 C 시절에 저장된 선택은 새 4개(규칙 D)에 없어도 그대로 인정한다", () => {
  // 1975-11-10 서울, 시간 모름: 규칙 C는 맞춰주기 + 거리두기(둘 다 간직하는 쪽), 규칙 D는 맞춰주기 + 다가가기
  const base = { year: 1975, month: 11, day: 10, place: seoul };
  const r = computeBirth({ ...base, time: { kind: "unknown" } }, ref, period);
  assert.deepEqual([...new Set(r.options!.map((o) => o.style))], ["맞춰주기", "다가가기"]);
  const old = computeBirth({ ...base, time: { kind: "unknown", pick: "00:30" }, typePick: { competency: "기대기", style: "거리두기" } }, ref, period);
  const c = old.resolved!.character;
  assert.equal(c.style, "거리두기");
  assert.equal(c.competency, "기대기");
  assert.equal(c.options?.some((o) => o.style === "거리두기"), false); // 화면 토글은 새 4개만
});
