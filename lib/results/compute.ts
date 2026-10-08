import "server-only";
// 출생정보 + 답 → (후보가 갈리면) 후보 / (정해지면) 무료 결과. /api/result(확인용)와 /api/results(저장·다시 보기)가 같은 함수를 쓴다.
import { isAnswers, type Answers } from "@/lib/astro/answers";
import { computeBirth, type BirthInput, type BirthResult } from "@/lib/astro/birth";
import type { CalibrationTable } from "@/lib/astro/character";
import { placeFromCityId } from "@/lib/astro/cityData";
import { parseBirthRequest } from "@/lib/astro/validate";
import { ASTRO_DB } from "@/lib/report/dbData";
import { buildFreeResult, candidateCards, tieOptions, type FreeResult } from "@/lib/report/freeResult";
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
  | { kind: "candidates"; payload: { candidates: Array<Omit<BirthResult["candidates"][number], "name"> & { label: string; card: string }>; candidateIntro: string; accuracy: string } }
  | { kind: "tie"; payload: { tie: { intro: string; options: Array<{ competency: string; style: string; label: string; card: string }> }; accuracy: string } }
  | { kind: "result"; birth: BirthResult & { resolved: NonNullable<BirthResult["resolved"]> }; result: FreeResult };

/** RangeError(고른 후보 시각이 구간 밖 등)는 호출한 쪽에서 400으로 돌려준다. */
/**
 * askTie: 새로 결과를 만들 때만 동점 확인을 묻는다. 저장된 결과를 다시 볼 때는(이 화면이 생기기 전에 저장된 것 포함)
 * 묻지 않고 저장 당시 판정(고른 값이 있으면 그것, 없으면 1위)을 그대로 쓴다.
 */
export function computeFree(input: BirthInput, answers: Answers, nickname: string, opts: { askTie?: boolean } = {}): Computed {
  // 무료 결과에는 2026년만 필요하다(트랜짓 기간을 짧게).
  const birth = computeBirth(input, ref, { start: "2026-01-01", end: "2026-01-01" });
  if (!birth.resolved) {
    const { intro, cards, labels } = candidateCards(ASTRO_DB, birth.candidates.map((c) => c.name));
    return {
      kind: "candidates",
      // 동물 이름은 보내지 않는다(SHOW_CHARACTER=false) — 화면에는 label(유형 한 줄)
      payload: {
        candidates: birth.candidates.map(({ name, ...c }) => ({ ...c, label: labels[name], card: cards[name] })),
        candidateIntro: intro,
        accuracy: birth.accuracy,
      },
    };
  }
  const { chart, longitudes, character } = birth.resolved;
  if (character.needs_confirm && opts.askTie) {
    // 역량 동점(1·2위 3%p 안) — 사용자가 고른다(무작위 금지). 고른 값은 다음 요청의 birth.competencyPick으로 온다.
    return { kind: "tie", payload: { tie: tieOptions(ASTRO_DB, character), accuracy: birth.accuracy } };
  }
  return {
    kind: "result",
    birth: { ...birth, resolved: birth.resolved },
    result: buildFreeResult({ db: ASTRO_DB, chart, longitudes, character, answers, nickname, birthYear: input.year }),
  };
}
