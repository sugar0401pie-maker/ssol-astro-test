import "server-only";
// astro_results 읽기·쓰기(서버 전용, service_role). 모든 조회는 user_id로 한 번 더 거른다 —
// RLS를 우회하는 키라서, 코드에서 소유자 확인을 빠뜨리면 남의 결과가 보일 수 있기 때문.
import type { Answers } from "@/lib/astro/answers";
import type { BirthInput, BirthResult } from "@/lib/astro/birth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASTRO_DB } from "@/lib/report/dbData";
import { CONSENT_VERSION } from "./consent";

const TABLE = "astro_results";

export interface StoredResult {
  id: string;
  created_at: string;
  nickname: string;
  first_time: boolean;
  birth_input: BirthInput;
  answers: Answers;
  character: string;
  sun_sign: string;
  accuracy: string;
  paid_at?: string | null;
}

export async function saveResult(args: {
  userId: string;
  nickname: string;
  firstTime: boolean;
  input: BirthInput;
  answers: Answers;
  birth: BirthResult & { resolved: NonNullable<BirthResult["resolved"]> };
}): Promise<string> {
  const { userId, nickname, firstTime, input, answers, birth } = args;
  const { chart, character } = birth.resolved;
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .insert({
      user_id: userId,
      nickname,
      first_time: firstTime,
      birth_input: input,
      birth_local: birth.stored.local,
      time_zone: birth.stored.timeZone,
      birth_utc: birth.stored.utc,
      place_label: input.place.label,
      answers,
      accuracy: birth.accuracy,
      character: character.name,
      competency: character.competency,
      style: character.style,
      sun_sign: chart.planets.sun!.sign,
      engine_version: birth.engineVersion,
      db_version: ASTRO_DB.version,
      consent_version: CONSENT_VERSION,
      consented_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`결과 저장 실패: ${error?.code ?? "no data"}`);
  return data.id as string;
}

export async function listResults(userId: string): Promise<Array<Pick<StoredResult, "id" | "created_at" | "nickname" | "character" | "sun_sign" | "accuracy">>> {
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .select("id, created_at, nickname, character, sun_sign, accuracy")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`결과 목록 실패: ${error.code}`);
  return data ?? [];
}

const RESULT_COLS = "id, created_at, nickname, first_time, birth_input, answers, character, sun_sign, accuracy";

export async function getResult(userId: string, id: string): Promise<StoredResult | null> {
  const q = (cols: string) => createAdminClient().from(TABLE).select(cols).eq("user_id", userId).eq("id", id).maybeSingle();
  let { data, error } = await q(`${RESULT_COLS}, paid_at`);
  // 결제 마이그레이션(20261008000100) 실행 전이면 paid_at 칸이 없다 — 그 칸 없이 다시 읽어 결과 보기는 계속 되게(42703 = 없는 칸).
  if (error?.code === "42703") ({ data, error } = await q(RESULT_COLS));
  if (error) throw new Error(`결과 조회 실패: ${error.code}`);
  return (data as unknown as StoredResult | null) ?? null;
}

export async function deleteResult(userId: string, id: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from(TABLE).delete().eq("user_id", userId).eq("id", id).select("id");
  if (error) throw new Error(`결과 삭제 실패: ${error.code}`);
  return (data?.length ?? 0) > 0;
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// ---- 결제·유료 리포트 ----

export interface PayState {
  paid: boolean;
  reportStatus: "none" | "generating" | "ready" | "failed";
  reportStartedAt: string | null;
}

export async function getPayState(userId: string, resultId: string): Promise<(PayState & { report: unknown }) | null> {
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .select("paid_at, report_status, report_started_at, report")
    .eq("user_id", userId)
    .eq("id", resultId)
    .maybeSingle();
  if (error) throw new Error(`결제 상태 조회 실패: ${error.code}`);
  if (!data) return null;
  return { paid: !!data.paid_at, reportStatus: data.report_status, reportStartedAt: data.report_started_at, report: data.report };
}

export async function createOrder(userId: string, resultId: string, amount: number): Promise<string> {
  const { data, error } = await createAdminClient()
    .from("astro_orders")
    .insert({ user_id: userId, result_id: resultId, amount, status: "pending" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`주문 생성 실패: ${error?.code ?? "no data"}`);
  return data.id as string;
}

export async function getOrder(orderId: string) {
  const { data, error } = await createAdminClient()
    .from("astro_orders")
    .select("id, user_id, result_id, amount, status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`주문 조회 실패: ${error.code}`);
  return data as { id: string; user_id: string; result_id: string; amount: number; status: string } | null;
}

/** pending일 때만 바꾼다(같은 주문을 두 번 승인 처리하지 않게). 바뀌었으면 true. */
export async function settleOrder(orderId: string, status: "paid" | "canceled", extra: { paymentKey?: string; method?: string | null } = {}): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("astro_orders")
    .update({
      status,
      ...(status === "paid" ? { paid_at: new Date().toISOString(), payment_key: extra.paymentKey ?? null, method: extra.method ?? null } : {}),
    })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id");
  if (error) throw new Error(`주문 갱신 실패: ${error.code}`);
  return (data?.length ?? 0) > 0;
}

export async function markResultPaid(resultId: string): Promise<void> {
  const { error } = await createAdminClient().from(TABLE).update({ paid_at: new Date().toISOString() }).eq("id", resultId).is("paid_at", null);
  if (error) throw new Error(`결과 결제 표시 실패: ${error.code}`);
}

/**
 * 리포트 생성 자리를 잡는다: 아직 없거나 실패했거나, 생성 중인데 너무 오래(5분) 멈춰 있으면 'generating'으로 바꾸고 true.
 * 이미 누가 만들고 있으면 false — 같은 리포트를 동시에 두 번 만들지 않게.
 */
export async function claimReportGeneration(resultId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .update({ report_status: "generating", report_started_at: new Date().toISOString() })
    .eq("id", resultId)
    .not("paid_at", "is", null)
    .or(`report_status.in.(none,failed),and(report_status.eq.generating,report_started_at.lt.${staleBefore})`)
    .select("id");
  if (error) throw new Error(`리포트 생성 시작 실패: ${error.code}`);
  return (data?.length ?? 0) > 0;
}

export async function saveReport(resultId: string, report: unknown | null): Promise<void> {
  const { error } = await createAdminClient()
    .from(TABLE)
    .update(report ? { report, report_status: "ready" } : { report_status: "failed" })
    .eq("id", resultId);
  if (error) throw new Error(`리포트 저장 실패: ${error.code}`);
}

export async function getResultForReport(resultId: string) {
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .select("id, user_id, nickname, birth_input, answers")
    .eq("id", resultId)
    .maybeSingle();
  if (error) throw new Error(`결과 조회 실패: ${error.code}`);
  return data as { id: string; user_id: string; nickname: string; birth_input: BirthInput; answers: Answers } | null;
}
