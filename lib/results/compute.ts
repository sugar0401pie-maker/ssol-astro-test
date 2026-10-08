import "server-only";
// 출생정보 + 답 → (후보가 갈리면) 후보 / (정해지면) 무료 결과. /api/result(확인용)와 /api/results(저장·다시 보기)가 같은 함수를 쓴다.
import { isAnswers, type Answers } from "@/lib/astro/answers";
import { computeBirth, type BirthInput, type BirthResult } from "@/lib/astro/birth";
import type { CalibrationTable } from "@/lib/astro/character";
import { placeFromCityId } from "@/lib/astro/cityData";
import { parseBirthRequest } from "@/lib/astro/validate";
import { ASTRO_DB } from "@/lib/report/dbData";
import { buildFreeResult, candidateCards, type FreeResult } from "@/lib/report/freeResult";
import calibration from "@/data/astro/calibration.json";

const ref = calibration as CalibrationTable;

export type Parsed = { ok: true; input: BirthInput; answers: Answers; nickname: string } | { ok: false; error: string };

/** 닉네임은 DB 문장의 {닉네임}을 채운다. 괄호는 토큰과 헷갈리지 않게 지운다. */
export function cleanNickname(v: unknown): string {
  return typeof v === "string" ? v.replace(/[{}]/g, "").trim().slice(0, 12) : "";
}

export function parseResultRequest(body: Record<string, unknown> | null): Parsed {
  const parsed = parseBirthRequest(body?.birth, { findCity: placeFromCityId });
  if (!parsed.ok) return parsed;
  if (!isAnswers(body?.answers)) return { ok: false, error: "질문 답을 다시 확인해 주세요." };
  const nickname = cleanNickname(body?.nickname);
  if (!nickname) return { ok: false, error: "닉네임을 다시 확인해 주세요." };
  return { ok: true, input: parsed.input, answers: body.answers, nickname };
}

export type Computed =
  | { kind: "candidates"; payload: { candidates: Array<BirthResult["candidates"][number] & { card: string }>; candidateIntro: string; accuracy: string } }
  | { kind: "result"; birth: BirthResult & { resolved: NonNullable<BirthResult["resolved"]> }; result: FreeResult };

/** RangeError(고른 후보 시각이 구간 밖 등)는 호출한 쪽에서 400으로 돌려준다. */
export function computeFree(input: BirthInput, answers: Answers, nickname: string): Computed {
  // 무료 결과에는 2026년만 필요하다(트랜짓 기간을 짧게).
  const birth = computeBirth(input, ref, { start: "2026-01-01", end: "2026-01-01" });
  if (!birth.resolved) {
    const { intro, cards } = candidateCards(ASTRO_DB, birth.candidates.map((c) => c.name));
    return {
      kind: "candidates",
      payload: { candidates: birth.candidates.map((c) => ({ ...c, card: cards[c.name] })), candidateIntro: intro, accuracy: birth.accuracy },
    };
  }
  const { chart, longitudes, character } = birth.resolved;
  return {
    kind: "result",
    birth: { ...birth, resolved: birth.resolved },
    result: buildFreeResult({ db: ASTRO_DB, chart, longitudes, character, answers, nickname, birthYear: input.year }),
  };
}
