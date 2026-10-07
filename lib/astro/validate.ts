// /api/chart 요청 본문 검증. 잘못된 입력은 계산하지 않고 거부한다(fail closed).
import { TIME_BANDS, type BirthInput, type BirthTime } from "./birth.ts";
import { koreaRegion } from "./places.ts";
import { isValidLocalDate, isValidTimeZone } from "./time.ts";

export const MIN_YEAR = 1900;

export type ValidationResult = { ok: true; input: BirthInput } | { ok: false; error: string };

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

export function parseBirthRequest(body: unknown, now: Date = new Date()): ValidationResult {
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
  let place = null;
  if (typeof p?.region === "string") {
    place = koreaRegion(p.region);
  } else if (
    typeof p?.label === "string" && typeof p.lat === "number" && typeof p.lng === "number" &&
    typeof p.timeZone === "string" && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 && isValidTimeZone(p.timeZone)
  ) {
    // 해외 도시: 도시 검색(GeoNames 자체 DB, 미구현)이 돌려준 값. 상세 주소는 받지 않는다.
    place = { label: p.label.slice(0, 80), lat: p.lat, lng: p.lng, timeZone: p.timeZone };
  }
  if (!place) return { ok: false, error: "태어난 곳을 다시 확인해 주세요." };

  return { ok: true, input: { year, month, day, time, place } };
}
