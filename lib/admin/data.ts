import "server-only";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserIdFromAuthHeader } from "@/lib/supabase/auth";
import { getAccountEmail } from "@/lib/results/store";
import { isCompEmail } from "@/lib/billing/comp";
import { amountLabel, birthDateLabel, birthTimeLabel, kstDayRange, kstStamp, loginMethodLabel, toCsv, type AdminStats } from "./stats";

// 관리자 화면(owner 2026-11-09) 서버 쪽: 관리자 확인, 날짜 기준 숫자, 엑셀(CSV) 내보내기.
// 관리자 = lib/billing/comp.ts 목록(+ Vercel ASTRO_COMP_EMAILS).

export async function isAdmin(req: NextRequest): Promise<boolean> {
  const userId = await getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return false;
  return isCompEmail(await getAccountEmail(userId));
}

/** 마이그레이션 20261109000000의 함수로 센다. 함수가 없으면 'missing'(대신 다른 방법으로 세지 않는다 — 숫자가 틀릴 수 있어서). */
export async function loadAdminStats(day: string): Promise<AdminStats | "missing"> {
  const { data, error } = await createAdminClient().rpc("astro_admin_stats", { p_day: day });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") return "missing";
    throw new Error(`집계 실패: ${error.code}`);
  }
  return data as AdminStats;
}

type Order = { amount: number | null; currency?: string | null; status: string; paid_at: string | null; method: string | null; receipt_email?: string | null };
type Row = {
  id: string; created_at: string; user_id: string | null; nickname: string; first_time: boolean; birth_input: { lang?: string; year?: number; month?: number; day?: number; time?: { kind?: string; hour?: number; minute?: number; band?: string } } | null;
  place_label: string | null; time_zone: string | null;
  answers: { q1?: string; q2?: string; q3?: string } | null; accuracy: string; sun_sign: string; competency: string; style: string;
  paid_at: string | null; report_status: string | null; last_page: number | null;
  attribution_first: Record<string, string> | null; astro_orders: Order[] | null;
};

const COLS =
  "id, created_at, user_id, nickname, first_time, birth_input, place_label, time_zone, answers, accuracy, sun_sign, competency, style, paid_at, report_status, last_page, attribution_first, astro_orders(amount, currency, status, paid_at, method, receipt_email)";

async function loadRows(start: string | null, end: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let q = createAdminClient().from("astro_results").select(COLS).lt("created_at", end);
    if (start) q = q.gte("created_at", start);
    const { data, error } = await q.order("created_at", { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`결과 조회 실패: ${error.code}`);
    out.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) return out;
  }
}

type Account = { email: string; provider: string | null };

/** 계정 이메일·로그인 수단. 네이버는 계정 이메일이 비어 있어 로그인 제공자가 준 연락처 이메일을 쓴다(getAccountEmail과 같은 규칙). */
async function loadAccounts(ids: string[]): Promise<Map<string, Account>> {
  const db = createAdminClient();
  const map = new Map<string, Account>();
  for (let i = 0; i < ids.length; i += 10) {
    await Promise.all(
      ids.slice(i, i + 10).map(async (id) => {
        const { data, error } = await db.auth.admin.getUserById(id);
        if (error || !data.user) return;
        const u = data.user;
        const fromIdentity =
          (u.identities ?? [])
            .map((x) => (x.identity_data ?? {}) as Record<string, unknown>)
            .map((d) => (typeof d.contact_email === "string" ? d.contact_email : typeof d.email === "string" ? d.email : ""))
            .find((e) => e) ?? "";
        const provider = typeof u.app_metadata?.provider === "string" ? u.app_metadata.provider : null;
        map.set(id, { email: u.email || fromIdentity, provider });
      }),
    );
  }
  return map;
}

const HEADER = [
  "참가_시각(한국)", "결과_id", "언어", "닉네임", "로그인_수단", "이메일", "출생_날짜", "출생_시각", "출생지", "출생지_시간대", "결제", "결제_시각(한국)", "결제_금액", "결제_수단",
  "태양_별자리", "유형_역량", "유형_방식", "출생시각_정확도", "점성술_처음", "Q1_고민영역", "Q2_2026_한단어", "Q3_2027_바람",
  "마지막으로_본_장", "리포트_상태", "처음_유입", "유입_캠페인", "앱안_브라우저",
];

/**
 * scope 'day' = 그날 만들어진 결과, 'upto' = 그날까지 전체. 출생 날짜·시각·장소도 넣는다(owner 2026-11-09 지시 —
 * 개인정보처리방침은 출생 정보를 '출생차트 도출에만' 쓴다고 하므로 이 파일은 운영 확인용으로만, 통계 분석에 쓰려면 방침부터 고칠 것).
 */
export async function buildExportCsv(day: string, scope: "day" | "upto"): Promise<{ csv: string; count: number }> {
  const { start, end } = kstDayRange(day);
  const rows = await loadRows(scope === "day" ? start : null, end);
  const accounts = await loadAccounts([...new Set(rows.map((r) => r.user_id).filter((x): x is string => !!x))]);
  const body = rows.map((r) => {
    const acc = r.user_id ? accounts.get(r.user_id) : undefined;
    const order = (r.astro_orders ?? []).find((o) => o.status === "paid") ?? null;
    const paidLabel = order ? "결제" : r.paid_at ? "무료 열람(관리자)" : "";
    const a = r.attribution_first ?? {};
    return [
      kstStamp(r.created_at), r.id, r.birth_input?.lang === "en" ? "영문" : "한국어", r.nickname,
      loginMethodLabel(acc?.provider, !!r.user_id), acc?.email || order?.receipt_email || "",
      birthDateLabel(r.birth_input), birthTimeLabel(r.birth_input?.time), r.place_label ?? "", r.time_zone ?? "",
      paidLabel, kstStamp(order?.paid_at ?? r.paid_at), order ? amountLabel(order.amount, order.currency) : "", order?.method ?? "",
      r.sun_sign, r.competency, r.style, r.accuracy, r.first_time ? "예" : "아니요",
      r.answers?.q1 ?? "", r.answers?.q2 ?? "", r.answers?.q3 ?? "",
      r.last_page ?? "", r.report_status ?? "",
      a.utm_source || a.referrer_host || "(직접·알 수 없음)", a.utm_campaign ?? "", a.in_app ?? "",
    ];
  });
  return { csv: toCsv(HEADER, body), count: rows.length };
}
