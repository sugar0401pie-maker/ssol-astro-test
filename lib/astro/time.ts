// 현지 출생 시각 → UTC 변환. 고정 오프셋(+9)이 아니라 IANA 시간대 ID로 계산해야
// 한국의 과거 서머타임(1948–1960, 1987–1988)과 UTC+8:30 시절(1954–1961)이 자동 반영된다
// (마스터스펙 2장). Node/브라우저 내장 ICU의 시간대 데이터를 쓴다 — 외부 호출 없음.

export interface LocalDateTime {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number; // 0–23
  minute: number;
}

/** 해당 UTC 순간에 그 시간대의 UTC 오프셋(분). */
export function tzOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60_000);
}

/**
 * 현지 시각을 UTC Date로. 서머타임 전환으로 존재하지 않는 시각(시계를 앞당긴 구간)은
 * 전환 전 오프셋으로, 두 번 있는 시각은 앞쪽(서머타임 쪽)으로 해석한다 — 어느 쪽이든
 * 차이는 1시간 이내이고, 결과는 'B·C 등급과 같은 근사'라는 점을 저장값(local+tz+utc)으로 남긴다.
 */
export function localToUtc(local: LocalDateTime, timeZone: string): Date {
  const naive = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  // 두 번 보정하면 전환 경계 근처도 수렴한다.
  let guess = naive - tzOffsetMinutes(naive, timeZone) * 60_000;
  guess = naive - tzOffsetMinutes(guess, timeZone) * 60_000;
  // 겹치는 시각이면 1시간 앞 오프셋도 같은 현지 시각을 만드는지 확인해 앞쪽을 택한다.
  const earlier = guess - 3_600_000;
  if (earlier + tzOffsetMinutes(earlier, timeZone) * 60_000 === naive) guess = earlier;
  return new Date(guess);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isValidLocalDate(year: number, month: number, day: number): boolean {
  if (![year, month, day].every(Number.isInteger)) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}
