// 정답 비교 세트(2026-10-10 패키지 18_정답비교세트): 출생 30명의 행성·ASC·MC를 엔진과 독립적으로
// skyfield + JPL DE421로 계산한 '정답'과 우리 TS 엔진을 비교한다(compare_engine.py와 같은 허용오차).
// 엔진이나 astronomy-engine 버전을 바꿀 때마다 이 테스트가 지켜 준다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeNatal, retrogradeAt } from "./natal.ts";
import { localToUtc } from "./time.ts";

interface RefBody { lon: number; speed_deg_per_day: number; retro: boolean; sign: string; house: number }
interface Birth { id: string; local: string; fold: number; lat: number; lng: number; tz: string; utc: string; tz_flag: string; reference: { bodies: Record<string, RefBody> } }
const ref: { births: Birth[]; tz_probes: Array<{ local: string; tz: string; utc: string; tz_flag: string }> } = JSON.parse(
  readFileSync(new URL("../../docs/spec/18_정답비교세트/정답세트.json", import.meta.url), "utf8"),
);

const TOL_ARCSEC: Record<string, number> = { moon: 120, asc: 360, mc: 360 }; // 나머지 60″
const diffArcsec = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180) * 3600;
const local = (s: string) => {
  const [d, t] = s.split(" ");
  const [year, month, day] = d.split("-").map(Number);
  const [hour, minute] = t.split(":").map(Number);
  return { year, month, day, hour, minute };
};

test("정답 비교 세트: 30명 × 10행성·ASC·MC 경도·별자리·하우스·역행이 정답과 맞는다", () => {
  assert.equal(ref.births.length, 30);
  for (const b of ref.births) {
    const utc = new Date(b.utc);
    const { chart, L } = computeNatal(utc, b.lat, b.lng, true);
    const retro = new Set<string>(retrogradeAt(utc));
    for (const [key, r] of Object.entries(b.reference.bodies)) {
      const lon = (L as Record<string, number | undefined>)[key];
      assert.ok(lon !== undefined, `${b.id} ${key} 없음`);
      const d = diffArcsec(lon, r.lon);
      assert.ok(d <= (TOL_ARCSEC[key] ?? 60), `${b.id} ${key} ${d.toFixed(1)}″`);
      const p = (chart.planets as Record<string, { sign: string; house?: number } | undefined>)[key];
      assert.equal(p?.sign, r.sign, `${b.id} ${key} 별자리`);
      if (key !== "asc" && key !== "mc") {
        assert.equal(p?.house, r.house, `${b.id} ${key} 하우스`);
        // 정류 근처(하루 0.05° 미만)만 역행 불일치를 봐준다(compare_engine.py의 WARN)
        if (key !== "sun" && key !== "moon" && Math.abs(r.speed_deg_per_day) >= 0.05) assert.equal(retro.has(key), r.retro, `${b.id} ${key} 역행`);
      }
    }
  }
});

test("정답 비교 세트: 현지 시각 → UTC 변환이 IANA(zoneinfo, fold=0) 정답과 같다", () => {
  for (const b of ref.births) {
    if (b.fold !== 0) continue; // 두 번 있는 시각의 '두 번째'(fold=1)는 화면에서 아직 고르지 않는다 — 첫 번째만 계산
    assert.equal(localToUtc(local(b.local), b.tz).toISOString().replace(".000Z", "Z"), b.utc, `${b.id} ${b.local} ${b.tz}`);
  }
  for (const p of ref.tz_probes) assert.equal(localToUtc(local(p.local), p.tz).toISOString().replace(".000Z", "Z"), p.utc, `${p.local} ${p.tz}`);
});
