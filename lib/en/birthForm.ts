// 영문 출생 정보 입력(/en/start, (나) 영문 전용)의 순수 규칙 — 화면과 테스트가 같이 쓴다.
// 문구는 영문 정책 패키지 08_on-screen-texts §1·§2와 번역 DATA04(time_bands)를 그대로 쓴다.
import type { TimeBand } from "../astro/birth.ts";

export const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
export const EN_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** 영문판 나이 기준(2026-11-04 결정, 캘리포니아 SB 243 대응): 만 18세 이상 */
export const EN_MIN_AGE = 18;

/** 영문 동의 문구 판(문구를 바꾸면 판도 바꾼다) */
export const EN_CONSENT_VERSION = "astro-en-2026-11-06-draft";

export const EN_BANDS: { id: TimeBand | "unknown"; label: string; range: string }[] = [
  { id: "dawn", label: "Early morning", range: "00:00–06:00" },
  { id: "morning", label: "Morning", range: "06:00–12:00" },
  { id: "afternoon", label: "Afternoon", range: "12:00–18:00" },
  { id: "evening", label: "Evening", range: "18:00–24:00" },
  { id: "unknown", label: "I'm not sure of my birth time", range: "" },
];

export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** 그 날짜(현지 달력) 기준 만 나이 */
export function ageOn(birth: { year: number; month: number; day: number }, now: Date): number {
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  let age = y - birth.year;
  if (m < birth.month || (m === birth.month && d < birth.day)) age -= 1;
  return age;
}

/** "Apr 1, 1996" — 월 이름 표기(미국 MM/DD·유럽 DD/MM 혼동 방지, 개발메모 EN12) */
export const formatDateEn = (y: number, m: number, d: number) => `${EN_MONTHS_SHORT[m - 1]} ${d}, ${y}`;

export type EnTime = { kind: "exact"; hour: number; minute: number } | { kind: "band"; band: TimeBand } | { kind: "unknown" };

export interface EnBirthForm {
  nickname: string;
  year: number | null;
  month: number | null;
  day: number | null;
  /** 시간 모름 체크 */
  unknownTime: boolean;
  hour: number | null;
  minute: number | null;
  band: TimeBand | "unknown" | null;
  cityId: number | null;
  /** ① 18세 이상 + 이용약관 동의 + 개인정보처리방침 확인 */
  agreeTerms: boolean;
  /** ② 출생정보·답변 처리 동의(별도) */
  agreeBirth: boolean;
}

export type EnErrors = Partial<Record<"nickname" | "date" | "time" | "place" | "agree", string>>;

export const EN_ERR = {
  nickname: "Please enter a nickname.",
  date: "Please choose your date of birth.",
  future: "Your date of birth can't be in the future.",
  age: "SSOL Astro House is for people aged 18 and over.",
  time: "Please choose your birth time, or tell us you're not sure.",
  place: "Please choose your birth city from the list.",
  agree: "Please tick both boxes to see your reading. We need your birth details to calculate your chart.",
} as const;

export function enTime(f: EnBirthForm): EnTime | null {
  if (!f.unknownTime) return f.hour !== null && f.minute !== null ? { kind: "exact", hour: f.hour, minute: f.minute } : null;
  if (f.band === "unknown") return { kind: "unknown" };
  return f.band ? { kind: "band", band: f.band } : null;
}

/** 모든 칸 검사 — 비어 있으면 통과(오류 없음) */
export function validateEnBirth(f: EnBirthForm, now: Date): EnErrors {
  const e: EnErrors = {};
  if (!f.nickname.trim()) e.nickname = EN_ERR.nickname;
  if (f.year === null || f.month === null || f.day === null || f.day > daysInMonth(f.year, f.month)) e.date = EN_ERR.date;
  else {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (new Date(f.year, f.month - 1, f.day) > t) e.date = EN_ERR.future;
    else if (ageOn({ year: f.year, month: f.month, day: f.day }, now) < EN_MIN_AGE) e.date = EN_ERR.age;
  }
  if (!enTime(f)) e.time = EN_ERR.time;
  if (f.cityId === null) e.place = EN_ERR.place;
  if (!f.agreeTerms || !f.agreeBirth) e.agree = EN_ERR.agree;
  return e;
}

/** 서버(/api/chart·/api/result)에 보내는 birth 모양 — 한국어판과 같고 도시만 영문 목록(lang "en") */
export function enBirthBody(f: EnBirthForm) {
  return { year: f.year, month: f.month, day: f.day, time: enTime(f), place: { cityId: f.cityId, lang: "en" } };
}

export const cleanNicknameEn = (v: string) => v.replace(/[{}]/g, "").trim().slice(0, 12);
