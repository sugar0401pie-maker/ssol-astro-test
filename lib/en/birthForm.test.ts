import { test } from "node:test";
import assert from "node:assert/strict";
import { ageOn, EN_ERR, enBirthBody, enTime, formatDateEn, validateEnBirth, type EnBirthForm } from "./birthForm.ts";

const now = new Date(2026, 10, 4); // 2026-11-04
const ok: EnBirthForm = { nickname: "Jen", year: 1996, month: 4, day: 1, unknownTime: false, hour: 10, minute: 17, band: null, cityId: 1838524, agreeTerms: true, agreeBirth: true };

test("다 채우면 오류 없음, 서버 요청은 영문 도시 목록", () => {
  assert.deepEqual(validateEnBirth(ok, now), {});
  assert.deepEqual(enBirthBody(ok), { year: 1996, month: 4, day: 1, time: { kind: "exact", hour: 10, minute: 17 }, place: { cityId: 1838524, lang: "en" } });
});

test("만 18세 생일 당일부터 통과, 하루 전은 막음", () => {
  assert.equal(ageOn({ year: 2008, month: 11, day: 4 }, now), 18);
  assert.equal(ageOn({ year: 2008, month: 11, day: 5 }, now), 17);
  assert.equal(validateEnBirth({ ...ok, year: 2008, month: 11, day: 4 }, now).date, undefined);
  assert.equal(validateEnBirth({ ...ok, year: 2008, month: 11, day: 5 }, now).date, EN_ERR.age);
});

test("미래 날짜·없는 날짜·빈 칸", () => {
  assert.equal(validateEnBirth({ ...ok, year: 2027 }, now).date, EN_ERR.future);
  assert.equal(validateEnBirth({ ...ok, month: 2, day: 30 }, now).date, EN_ERR.date);
  assert.equal(validateEnBirth({ ...ok, nickname: "  " }, now).nickname, EN_ERR.nickname);
  assert.equal(validateEnBirth({ ...ok, cityId: null }, now).place, EN_ERR.place);
});

test("동의 두 개 모두 있어야 통과", () => {
  assert.equal(validateEnBirth({ ...ok, agreeBirth: false }, now).agree, EN_ERR.agree);
  assert.equal(validateEnBirth({ ...ok, agreeTerms: false }, now).agree, EN_ERR.agree);
});

test("시간: 정확한 시각 / 시간대 / 모름", () => {
  assert.equal(enTime({ ...ok, minute: null }), null);
  assert.deepEqual(enTime({ ...ok, unknownTime: true, band: "evening" }), { kind: "band", band: "evening" });
  assert.deepEqual(enTime({ ...ok, unknownTime: true, band: "unknown" }), { kind: "unknown" });
  assert.equal(enTime({ ...ok, unknownTime: true, band: null }), null);
});

test("날짜 표시는 월 이름", () => {
  assert.equal(formatDateEn(1996, 4, 1), "Apr 1, 1996");
});
