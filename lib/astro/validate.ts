// /api/chart 요청 본문 검증. 잘못된 입력은 계산하지 않고 거부한다(fail closed).
import { TIME_BANDS, type BirthInput, type BirthTime } from "./birth.ts";
import { COMPETENCY_BY_PLANET, type Competency } from "./constants.ts";
import { koreaRegion, type Place } from "./places.ts";
import { isValidLocalDate } from "./time.ts";

export const MIN_YEAR = 1900;

export type ValidationResult = { ok: true; input: BirthInput } | { ok: false; error: string };

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

export interface ParseOptions {
  now?: Date;
  /** 해외 도시 id → 좌표·시간대. 서버가 자기 도시 목록에서 찾는다(브라우저가 보낸 좌표는 믿지 않음). */
  findCity?: (id: number) => Place | null;
}

export function parseBirthRequest(body: unknown, opts: ParseOptions = {}): ValidationResult {
  const now = opts.now ?? new Date();
  if (!body || typeof body !== "object") return { ok: false, error: "요청 형식이 올바르지 않아요." };
  const b = body as Record<string, unknown>;
  const { year, month, day } = b;
  if (!isInt(year) || !isInt(month) || !isInt(day) || !isValidLocalDate(year, month, day)) {
    return { ok: false, error: "생년월일을 다시 확인해 주세요." };
  }
  if (year < MIN_YEAR || Date.UTC(year, month - 1, day) > now.getTime()) {
    return { ok: false, error: "생년월일을 다시 확인해 주세요." };
  }

  let time: BirthTime;
  const t = b.time as Record<string, unknown> | undefined;
  if (t?.kind === "exact" && isInt(t.hour) && isInt(t.minute) && t.hour >= 0 && t.hour < 24 && t.minute >= 0 && t.minute < 60) {
    time = { kind: "exact", hour: t.hour, minute: t.minute };
  } else if (t?.kind === "band" && typeof t.band === "string" && t.band in TIME_BANDS) {
    time = { kind: "band", band: t.band as keyof typeof TIME_BANDS, ...(typeof t.pick === "string" ? { pick: t.pick } : {}) };
  } else if (t?.kind === "unknown") {
    time = { kind: "unknown", ...(typeof t.pick === "string" ? { pick: t.pick } : {}) };
  } else {
    return { ok: false, error: "태어난 시간을 다시 확인해 주세요." };
  }

  const p = b.place as Record<string, unknown> | undefined;
  let place: Place | null = null;
  if (typeof p?.region === "string") {
    place = koreaRegion(p.region);
  } else if (isInt(p?.cityId) && opts.findCity) {
    // 해외 도시: 검색 결과의 id만 받고 좌표·시간대는 서버 목록에서 가져온다. 상세 주소는 받지 않는다.
    place = opts.findCity(p.cityId);
  }
  if (!place) return { ok: false, error: "태어난 곳을 다시 확인해 주세요." };

  // 역량 동점 확인에서 고른 역량(선택). 1·2위 중 하나인지는 엔진이 다시 확인한다(withCompetencyPick).
  const pick = (Object.values(COMPETENCY_BY_PLANET) as string[]).includes(b.competencyPick as string) ? (b.competencyPick as Competency) : undefined;
  return { ok: true, input: { year, month, day, time, place, ...(pick ? { competencyPick: pick } : {}) } };
}
