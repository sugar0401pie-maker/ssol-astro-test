// 바람 판정 v3가 owner 전달 원본(docs/reference/12_바람판정v3/바람판정_엔진.py)과 같은 점수를 내는지 검사한다.
// 기준값: scripts/gen_wish_fixtures.py → test/fixtures/wish-v3.json (샘플 1건 + 무작위 12건, C등급 포함).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Q3Wish } from "./answers.ts";
import type { Longitudes } from "./natal.ts";
import { computeWish, edgeOf, wishContextOf, isDayChart, levelOf, movementLabelOf, profectionLord, temperamentOf } from "./wish.ts";

type Fx = {
  utc: string; lat: number; lng: number; birth_local: string; with_time: boolean; L: Longitudes; day_chart: boolean;
  temperament: { variant: string };
  wishes: Record<string, { significators: Record<string, number>; years: Record<string, { support: number; movement: number; plus: unknown[]; minus: unknown[]; move: unknown[] }> }>;
};
const cases: Fx[] = JSON.parse(readFileSync(new URL("../../test/fixtures/wish-v3.json", import.meta.url), "utf8"));
const KO: Record<string, string> = {
  sun: "태양", moon: "달", mercury: "수성", venus: "금성", mars: "화성", jupiter: "목성", saturn: "토성", asc: "상승궁", mc: "천정",
};
const close = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`);

test("낮·밤 차트, 기질이 원본과 같다", () => {
  for (const c of cases) {
    assert.equal(isDayChart(new Date(`${c.utc}Z`), c.lat, c.lng), c.day_chart, c.utc);
    assert.equal(temperamentOf(c.L), c.temperament.variant, c.utc);
  }
});

test("바람이 걸린 자리·이루어짐·움직임 점수가 원본과 같다", () => {
  let n = 0;
  for (const c of cases) {
    for (const [wish, fx] of Object.entries(c.wishes)) {
      const r = computeWish(c.L, wish as Q3Wish, { birthDate: c.birth_local, dayChart: c.day_chart }) // 원본 그대로 비교(C등급 섹트 끄기는 wishContextOf에서);
      assert.deepEqual({ ...r.significators }, fx.significators, `${c.utc} ${wish} significators`);
      for (const y of r.years) {
        const e = fx.years[String(y.year)];
        // 원본 support는 변화 바람 가점 전 값(가점은 판정 단계에서 더한다).
        close(y.baseSupport, e.support, `${c.utc} ${wish} ${y.year} support`);
        close(y.movement, e.movement, `${c.utc} ${wish} ${y.year} movement`);
        assert.equal(y.factors.filter((f) => f.value > 0).length, e.plus.length, `${c.utc} ${wish} ${y.year} plus`);
        assert.equal(y.factors.filter((f) => f.value < 0).length, e.minus.length, `${c.utc} ${wish} ${y.year} minus`);
        assert.equal(y.moves.length, e.move.length, `${c.utc} ${wish} ${y.year} move`);
        // 키론 리턴 정확일까지 원본과 같은지(2026-10-09 키론 표 추가)
        const chiron = (e.move as Array<[string, string]>).find((m) => m[0] === "키론 리턴");
        assert.equal(y.moves.find((m) => m.kind === "chiron_return")?.exact, chiron?.[1], `${c.utc} ${wish} ${y.year} chiron`);
        n++;
      }
    }
  }
  assert.ok(n > 100);
});

test("판정·경계·움직임 표시 기준(스펙 5-2 v3)", () => {
  assert.equal(levelOf(4), "순풍");
  assert.equal(levelOf(3.99), "보통");
  assert.equal(levelOf(0), "보통"); // 스펙: 0 미만이 역풍(원본 label()은 0 이하)
  assert.equal(levelOf(-0.01), "역풍");
  assert.equal(edgeOf("보통", 3.2, true), "EDGE_UP_CLEAR");
  assert.equal(edgeOf("보통", 3.2, false), "EDGE_UP_MIXED");
  assert.equal(edgeOf("보통", 0.5, false), "EDGE_MID_LOW");
  assert.equal(edgeOf("역풍", -0.5, false), "EDGE_LOW_HIGH");
  assert.equal(edgeOf("역풍", -1.5, false), null);
  assert.equal(edgeOf("보통", 2, false), null);
  assert.equal(movementLabelOf(3.2), "움직이는 해");
  assert.equal(movementLabelOf(1.8), "잔잔한 해");
  assert.equal(movementLabelOf(2.5), "");
});

test("샘플(1996-04-01 경기): 프로펙션·판정이 원본 샘플 판정과 같다", () => {
  const sample = JSON.parse(readFileSync(new URL("../../docs/reference/12_바람판정v3/샘플_바람판정_1996-04-01_경기.json", import.meta.url), "utf8"));
  const c = cases[0];
  for (const [y, lord] of Object.entries(sample.profection as Record<string, string>)) {
    assert.equal(KO[profectionLord(c.L.asc as number, c.birth_local, `${y}-12-31`)], lord, y);
  }
  for (const wish of ["안정", "도약", "새로운 시작"] as Q3Wish[]) {
    const r = computeWish(c.L, wish, { birthDate: c.birth_local, dayChart: c.day_chart });
    for (const y of r.years) {
      const e = sample[wish].years[String(y.year)];
      assert.equal(y.level, e.level, `${wish} ${y.year}`);
      assert.equal(y.movementLabel, e.movement_label, `${wish} ${y.year}`);
      assert.equal(y.edge ?? "", e.edge_db, `${wish} ${y.year} edge`);
    }
  }
  assert.equal(temperamentOf(c.L), sample.temperament.variant);
});

test("C등급은 섹트 보정을 끈다(wishContextOf)", () => {
  const stored = { local: "1990-05-05T12:00", utc: "1990-05-05T03:00:00.000Z", place: { lat: 37.5, lng: 127 } };
  assert.equal(wishContextOf(stored, "C").dayChart, null);
  assert.equal(wishContextOf(stored, "A").dayChart, true);
  assert.equal(wishContextOf(stored, "A").birthDate, "1990-05-05");
});
