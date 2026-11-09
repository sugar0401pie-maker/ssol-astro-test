// 관리자 화면(owner 2026-11-09) — 날짜 기준 숫자표·엑셀 내보내기의 순수 함수. DB·네트워크 없음.

export type Pair = { day: number; total: number };
export type AdminStats = {
  visitors: Pair; starts: Pair; births: Pair; results: Pair; members: Pair; paid: Pair; krw: Pair; usd_cents: Pair;
};

/** 'YYYY-MM-DD'이고 실제 있는 날짜면 그대로, 아니면 null */
export function parseAdminDay(v: string | null | undefined): string | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const t = Date.parse(`${v}T00:00:00Z`);
  return Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== v ? null : v;
}

/** 한국 날짜의 하루 [시작, 끝) — UTC ISO */
export function kstDayRange(day: string): { start: string; end: string } {
  const start = new Date(Date.parse(`${day}T00:00:00+09:00`));
  return { start: start.toISOString(), end: new Date(start.getTime() + 86_400_000).toISOString() };
}

/** 오늘(한국 날짜) */
export function todayKst(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}

/** 앞 단계 대비 비율(%) — 앞 단계가 0이면 null(표시 '–') */
export function rate(cur: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round((cur / prev) * 1000) / 10;
}

export type FunnelRow = { key: keyof AdminStats; label: string; note: string; day: number; total: number; dayRate: number | null; totalRate: number | null };

/** 깔때기 순서: 방문 → 테스트 시작 → 출생 정보 입력 → 테스트 본 사람(결과 저장) → 결제. 비율은 바로 앞 줄 대비. */
export const FUNNEL: Array<{ key: keyof AdminStats; label: string; note: string }> = [
  { key: "visitors", label: "방문", note: "첫 화면을 연 브라우저 수" },
  { key: "starts", label: "테스트 시작", note: "닉네임 화면까지 온 브라우저 수" },
  { key: "births", label: "출생 정보 입력", note: "생년월일·동의까지 마친 브라우저 수" },
  { key: "results", label: "테스트 본 사람", note: "저장된 결과 수(비회원 결과는 30일 뒤 지워져 빠짐)" },
  { key: "paid", label: "결제", note: "결제 완료 주문 수(관리자 무료 열람 제외)" },
];

export function funnelRows(s: AdminStats): FunnelRow[] {
  return FUNNEL.map((f, i) => {
    const cur = s[f.key];
    const prev = i > 0 ? s[FUNNEL[i - 1].key] : null;
    return { ...f, day: cur.day, total: cur.total, dayRate: prev ? rate(cur.day, prev.day) : null, totalRate: prev ? rate(cur.total, prev.total) : null };
  });
}

// ---------- 엑셀(CSV) ----------

/** 엑셀이 수식으로 읽지 않게(=,+,-,@로 시작하면 ' 붙임) + 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감쌈 */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 엑셀에서 한글이 깨지지 않게 맨 앞에 BOM */
export function toCsv(header: string[], rows: unknown[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const PROVIDER_LABEL: Record<string, string> = { email: "이메일", kakao: "카카오", google: "구글", "custom:naver": "네이버", naver: "네이버" };

/** 로그인 수단 이름. 계정이 없으면 '비회원(로그인 안 함)' */
export function loginMethodLabel(provider: string | null | undefined, isMember: boolean): string {
  if (!isMember) return "비회원(로그인 안 함)";
  if (!provider) return "알 수 없음";
  return PROVIDER_LABEL[provider] ?? provider;
}

/** 시각을 한국 시간 'YYYY-MM-DD HH:MM'으로 */
export function kstStamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t + 9 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
}

/** 금액 표시: 원화는 그대로, 달러는 센트 → 달러 */
export function amountLabel(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  return (currency ?? "KRW") === "USD" ? `US$${(amount / 100).toFixed(2)}` : `${amount}원`;
}

const BAND_LABEL: Record<string, string> = { dawn: "새벽", morning: "오전", afternoon: "오후", evening: "저녁" };

/** 출생 날짜 'YYYY-MM-DD'(입력값 그대로) */
export function birthDateLabel(b: { year?: number; month?: number; day?: number } | null | undefined): string {
  if (!b?.year || !b.month || !b.day) return "";
  return `${b.year}-${String(b.month).padStart(2, "0")}-${String(b.day).padStart(2, "0")}`;
}

/** 출생 시각: 시·분 입력이면 'HH:MM', 시간대면 '오전(시간대)', 모르면 '모름' */
export function birthTimeLabel(t: { kind?: string; hour?: number; minute?: number; band?: string } | null | undefined): string {
  if (!t?.kind) return "";
  if (t.kind === "exact" && typeof t.hour === "number" && typeof t.minute === "number")
    return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
  if (t.kind === "band") return `${BAND_LABEL[t.band ?? ""] ?? t.band ?? ""}(시간대)`;
  if (t.kind === "unknown") return "모름";
  return "";
}
