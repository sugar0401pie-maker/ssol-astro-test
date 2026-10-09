// 2026 하늘 주제 분류(해석 DB v1.3 A12t 규칙 그대로, 순수 함수). 2026년 안의 사건마다 점수를 매겨 주제별 최고점을 그 주제 점수로 쓰고,
// 가장 높은 주제가 이 사람의 2026 주제(동점이면 동점 순서가 작은 쪽, 모두 40점 미만이면 '고른 흐름').
// Q2 단어와 어울리는지(RULE_FIT): 1위가 안 어울려도 2위가 어울리고 2위 점수가 1위의 80% 이상이면 2위를 쓰고 어울림.
// 이 주제로 A12c(단어 × 주제) 첫 문단을 고른다. 규칙 숫자를 바꾸려면 DB(A12t)를 고치고 여기를 맞춘다.
import type { Longitudes } from "../astro/natal.ts";
import { signIndex, SIGNS } from "../astro/constants.ts";
import type { TimelineEvent } from "../astro/timeline.ts";
import type { AstroDb } from "./db.ts";

export type ThemeId = "WEIGHT" | "SHIFT" | "GROWTH" | "RELEASE" | "REVIEW" | "CALM";
/** 동점 순서(A12t priority) */
export type ScoredTheme = Exclude<ThemeId, "CALM">;
export const THEME_ORDER: readonly ScoredTheme[] = ["WEIGHT", "SHIFT", "GROWTH", "RELEASE", "REVIEW"];
const CALM_BELOW = 40;

const ANGLES = new Set(["sun", "moon", "asc", "mc"]);
const HARD = new Set(["합", "사각", "충"]);
const SOFT = new Set(["합", "삼분", "육분"]);

const hasExact = (e: TimelineEvent) => e.intervals.some((iv) => iv.exact && iv.exact.startsWith("2026"));

/** 주제별 점수(2026년 사건 기준). timed = 태어난 시간을 앎(A·B등급, 상승궁·하우스 있음) */
export function themeScores(events: TimelineEvent[], L: Longitudes): Record<Exclude<ThemeId, "CALM">, number> {
  const timed = L.asc !== undefined;
  const sunSign = SIGNS[signIndex(L.sun)];
  const moonSign = SIGNS[signIndex(L.moon)];
  const s = { WEIGHT: 0, SHIFT: 0, GROWTH: 0, RELEASE: 0, REVIEW: 0 };
  const up = (k: keyof typeof s, v: number) => (s[k] = Math.max(s[k], v));
  let reviewCount = 0;
  for (const e of events) {
    if (e.kind === "transit" && hasExact(e)) {
      const toAngle = ANGLES.has(e.target);
      if (e.transit === "saturn") {
        if (e.milestone === "saturn_return") up("WEIGHT", 100);
        if (toAngle && HARD.has(e.aspect)) up("WEIGHT", 60);
      } else if (e.transit === "uranus" && toAngle && HARD.has(e.aspect)) up("SHIFT", 70);
      else if (e.transit === "jupiter" && !e.milestone && toAngle && SOFT.has(e.aspect)) up("GROWTH", 55);
      else if (e.transit === "pluto" && toAngle && HARD.has(e.aspect)) up("RELEASE", 55);
      else if (e.transit === "neptune" && !e.milestone && toAngle && HARD.has(e.aspect)) up("RELEASE", 50);
    } else if (e.kind === "ingress" && e.intervals[0].from.startsWith("2026")) {
      const intoAsc = timed && e.house === 1;
      if (e.planet === "saturn" && intoAsc) up("WEIGHT", 55);
      if (e.planet === "uranus") {
        if (intoAsc) up("SHIFT", 75);
        if (!timed) up("SHIFT", 45); // 시간 모름(C등급)은 천왕성 별자리 이동 자체로
      }
      if (e.planet === "jupiter" && ((timed && (e.house === 1 || e.house === 10)) || e.sign === sunSign)) up("GROWTH", 50);
      if (e.planet === "neptune" && intoAsc) up("RELEASE", 45);
    } else if (e.kind === "retrograde") {
      const iv = e.intervals[0];
      if (!(iv.from <= "2026-12-31" && iv.to >= "2026-01-01")) continue;
      // 시간 앎이면 1·4·7·10하우스, 모르면 태양·달 별자리에 걸친 역행(상승궁은 모름)
      const hit = timed ? [1, 4, 7, 10].includes(e.house ?? 0) : e.sign === sunSign || e.sign === moonSign;
      if (hit) reviewCount++;
    }
  }
  s.REVIEW = Math.min(45, reviewCount * 15);
  return s;
}

/** A12t 주제 행에서 이름·어울리는 단어 */
export function themeTable(db: AstroDb): Record<ThemeId, { name: string; fitWords: string[] }> {
  const out = {} as Record<ThemeId, { name: string; fitWords: string[] }>;
  for (const r of db.dbs.A12t?.rows ?? []) {
    if (r.kind !== "주제") continue;
    const id = r.id.replace(/^THEME_/, "") as ThemeId;
    out[id] = { name: r.name, fitWords: r.fit_words.includes("없음") ? [] : r.fit_words.split("·").map((w) => w.trim()).filter(Boolean) };
  }
  return out;
}

/** 2026 주제 고르기 + 어울림(RULE_PICK·RULE_FIT) */
export function pickTheme(scores: Record<Exclude<ThemeId, "CALM">, number>, word: string, table: Record<ThemeId, { fitWords: string[] }>): { theme: ThemeId; fit: boolean } {
  const ranked = [...THEME_ORDER].sort((a, b) => scores[b] - scores[a] || THEME_ORDER.indexOf(a) - THEME_ORDER.indexOf(b));
  const [first, second] = ranked;
  if (scores[first] < CALM_BELOW) return { theme: "CALM", fit: false };
  const fits = (t: ScoredTheme) => table[t]?.fitWords.includes(word) ?? false;
  if (fits(first)) return { theme: first, fit: true };
  if (second && fits(second) && scores[second] >= scores[first] * 0.8) return { theme: second, fit: true };
  return { theme: first, fit: false };
}
