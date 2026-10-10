import "server-only";
// astro_results 읽기·쓰기(서버 전용, service_role). 모든 조회는 주인(계정 user_id 또는 비회원 열쇠 해시)으로 한 번 더 거른다 —
// RLS를 우회하는 키라서, 코드에서 소유자 확인을 빠뜨리면 남의 결과가 보일 수 있기 때문. 비회원 행은 user_id가 비어 있어야만 맞는다.
import type { Answers } from "@/lib/astro/answers";
import type { BirthInput, BirthResult } from "@/lib/astro/birth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASTRO_DB } from "@/lib/report/dbData";
import { CONSENT_VERSION } from "./consent";
import { guestExpiry } from "./guest";
import type { Owner } from "./owner";

/** 주인 조건을 붙인다(supabase 쿼리 빌더 — 타입이 너무 깊어 최소 모양으로만 다룬다). */
type Filterable = { eq(column: string, value: string): Filterable; is(column: string, value: null): Filterable };
function byOwner<Q>(q: Q, owner: Owner): Q {
  const f = q as unknown as Filterable;
  return (owner.kind === "user" ? f.eq("user_id", owner.userId) : f.is("user_id", null).eq("guest_token_hash", owner.tokenHash)) as unknown as Q;
}

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
  owner: Owner;
  nickname: string;
  firstTime: boolean;
  input: BirthInput;
  answers: Answers;
  birth: BirthResult & { resolved: NonNullable<BirthResult["resolved"]> };
  /** 쏘웰라 채팅용 요약(lib/report/chatSummary.ts). 없으면 저장하지 않는다. */
  chatSummary?: string | null;
}): Promise<string> {
  const { owner, nickname, firstTime, input, answers, birth, chatSummary } = args;
  const { chart, character } = birth.resolved;
  const row = {
      ...(owner.kind === "user"
        ? { user_id: owner.userId }
        : { user_id: null, guest_token_hash: owner.tokenHash, expires_at: guestExpiry(new Date(), false) }),
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
  };
  const insert = (r: object) => createAdminClient().from(TABLE).insert(r).select("id").single();
  let { data, error } = await insert(chatSummary ? { ...row, chat_summary: chatSummary, chat_summary_at: new Date().toISOString() } : row);
  // 비회원·요약 마이그레이션(20261008000200) 전이면 chat_summary 칸이 없다(42703) — 요약 없이 다시 저장(로그인 사용자는 계속 저장되게).
  if (error?.code === "42703" && chatSummary) ({ data, error } = await insert(row));
  if (error || !data) throw new Error(`결과 저장 실패: ${error?.code ?? "no data"}`);
  return data.id as string;
}

export async function listResults(
  owner: Owner,
): Promise<Array<Pick<StoredResult, "id" | "created_at" | "nickname" | "character" | "sun_sign" | "accuracy"> & { consent_version?: string; last_page?: number | null }>> {
  // consent_version: 같은 약관 버전에 이미 동의한 계정은 다음 테스트에서 동의를 체크된 상태로 보여 준다(패키지 v3)
  // last_page: 마지막으로 보던 장(마이그레이션 20261010000000 전이면 칸이 없어 빼고 다시 읽는다 — 42703)
  const base = "id, created_at, nickname, character, sun_sign, accuracy, consent_version";
  const q = (cols: string) => byOwner(createAdminClient().from(TABLE).select(cols), owner).order("created_at", { ascending: false }).limit(50);
  let { data, error } = await q(`${base}, last_page`);
  if (error?.code === "42703") ({ data, error } = await q(base));
  if (error) throw new Error(`결과 목록 실패: ${error.code}`);
  return (data ?? []) as unknown as Awaited<ReturnType<typeof listResults>>;
}

const RESULT_COLS = "id, created_at, nickname, first_time, birth_input, answers, character, sun_sign, accuracy";

export async function getResult(owner: Owner, id: string): Promise<StoredResult | null> {
  const q = (cols: string) => byOwner(createAdminClient().from(TABLE).select(cols), owner).eq("id", id).maybeSingle();
  let { data, error } = await q(`${RESULT_COLS}, paid_at`);
  // 결제 마이그레이션(20261008000100) 실행 전이면 paid_at 칸이 없다 — 그 칸 없이 다시 읽어 결과 보기는 계속 되게(42703 = 없는 칸).
  if (error?.code === "42703") ({ data, error } = await q(RESULT_COLS));
  if (error) throw new Error(`결과 조회 실패: ${error.code}`);
  return (data as unknown as StoredResult | null) ?? null;
}

/** 결과 2번 섹션에서 동점 유형을 바꿨을 때: 저장된 입력(competencyPick)과 판정 요약만 고친다. 본인 것만. */
export async function updateResultPick(
  owner: Owner,
  id: string,
  patch: { input: BirthInput; character: string; competency: string; style: string; chatSummary?: string | null },
): Promise<boolean> {
  const row: Record<string, unknown> = { birth_input: patch.input, character: patch.character, competency: patch.competency, style: patch.style };
  const run = (r: object) => byOwner(createAdminClient().from(TABLE).update(r), owner).eq("id", id).select("id");
  let { data, error } = await run(patch.chatSummary ? { ...row, chat_summary: patch.chatSummary, chat_summary_at: new Date().toISOString() } : row);
  if (error?.code === "42703" && patch.chatSummary) ({ data, error } = await run(row));
  if (error) throw new Error(`결과 수정 실패: ${error.code}`);
  return (data?.length ?? 0) > 0;
}

export async function deleteResult(owner: Owner, id: string): Promise<boolean> {
  const { data, error } = await byOwner(createAdminClient().from(TABLE).delete(), owner).eq("id", id).select("id");
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

export async function getPayState(owner: Owner, resultId: string): Promise<(PayState & { report: unknown }) | null> {
  const { data, error } = await byOwner(createAdminClient().from(TABLE).select("paid_at, report_status, report_started_at, report"), owner)
    .eq("id", resultId)
    .maybeSingle();
  if (error) throw new Error(`결제 상태 조회 실패: ${error.code}`);
  if (!data) return null;
  return { paid: !!data.paid_at, reportStatus: data.report_status, reportStartedAt: data.report_started_at, report: data.report };
}

export async function createOrder(owner: Owner, resultId: string, amount: number): Promise<string> {
  const who = owner.kind === "user" ? { user_id: owner.userId } : { user_id: null, guest_token_hash: owner.tokenHash };
  const { data, error } = await createAdminClient()
    .from("astro_orders")
    .insert({ ...who, result_id: resultId, amount, status: "pending" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`주문 생성 실패: ${error?.code ?? "no data"}`);
  return data.id as string;
}

export async function getOrder(orderId: string) {
  const { data, error } = await createAdminClient()
    .from("astro_orders")
    .select("id, user_id, guest_token_hash, result_id, amount, status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`주문 조회 실패: ${error.code}`);
  return data as OrderRow | null;
}

export interface OrderRow {
  id: string;
  user_id: string | null;
  guest_token_hash: string | null;
  result_id: string | null;
  amount: number;
  status: string;
}

/** 이 주문의 주인인지(비회원 주문이 나중에 계정으로 옮겨졌으면 계정으로만 맞는다). */
export function ownsOrder(owner: Owner, order: Pick<OrderRow, "user_id" | "guest_token_hash">): boolean {
  return owner.kind === "user" ? order.user_id === owner.userId : order.user_id === null && order.guest_token_hash === owner.tokenHash;
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
  const db = createAdminClient();
  const { error } = await db.from(TABLE).update({ paid_at: new Date().toISOString() }).eq("id", resultId).is("paid_at", null);
  if (error) throw new Error(`결과 결제 표시 실패: ${error.code}`);
  // 아직 계정이 없는 결제 결과는 결제일로부터 다시 30일(그 전에 가입하면 기한이 없어짐).
  const { error: e2 } = await db.from(TABLE).update({ expires_at: guestExpiry(new Date(), true) }).eq("id", resultId).is("user_id", null);
  if (e2) throw new Error(`보관 기한 갱신 실패: ${e2.code}`);
}

/**
 * 비회원 결과·주문을 계정으로 옮긴다(가입·로그인 직후, 같은 브라우저의 열쇠로). 옮긴 결과 수를 돌려준다.
 * 열쇠는 그 자리에서 지워져 다시 쓸 수 없다.
 */
export async function claimGuestResults(userId: string, tokenHash: string): Promise<number> {
  const db = createAdminClient();
  const { data, error } = await db
    .from(TABLE)
    .update({ user_id: userId, guest_token_hash: null, expires_at: null, claimed_at: new Date().toISOString() })
    .is("user_id", null)
    .eq("guest_token_hash", tokenHash)
    .select("id");
  if (error) throw new Error(`결과 옮기기 실패: ${error.code}`);
  const { error: e2 } = await db.from("astro_orders").update({ user_id: userId, guest_token_hash: null }).is("user_id", null).eq("guest_token_hash", tokenHash);
  if (e2) throw new Error(`주문 옮기기 실패: ${e2.code}`);
  return data?.length ?? 0;
}

/** 기한이 지난 비회원 결과를 지운다(결제 기록은 astro_orders에 남는다). 지운 수. */
export async function deleteExpiredGuestResults(now = new Date()): Promise<number> {
  const { data, error } = await createAdminClient().from(TABLE).delete().is("user_id", null).lt("expires_at", now.toISOString()).select("id");
  if (error) throw new Error(`기한 지난 결과 삭제 실패: ${error.code}`);
  return data?.length ?? 0;
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

/** 마지막으로 보던 장 저장(주인 확인). 칸이 없으면(마이그레이션 전) 조용히 넘어간다 — 이 기기 기억이 대신한다. */
export async function saveLastPage(owner: Owner, id: string, page: number): Promise<void> {
  const { error } = await byOwner(createAdminClient().from(TABLE).update({ last_page: page }), owner).eq("id", id);
  if (error && error.code !== "42703") throw new Error(`마지막 장 저장 실패: ${error.code}`);
}

/** 쓰는 중인 리포트(다 쓴 파트까지)를 저장 — 아직 생성 중일 때만(끝난 리포트를 덮지 않게). 실패해도 던지지 않는다. */
export async function savePartialReport(resultId: string, report: unknown): Promise<void> {
  const { error } = await createAdminClient().from(TABLE).update({ report }).eq("id", resultId).eq("report_status", "generating");
  if (error) console.warn(`리포트 중간 저장 실패: ${error.code}`);
}

/** 쏘웰라 채팅용 요약 갱신(리포트가 생기면 본문·제안까지). 실패해도 던지지 않는다 — 부가 기능. */
export async function saveChatSummary(resultId: string, summary: string | null): Promise<void> {
  if (!summary) return;
  const { error } = await createAdminClient().from(TABLE).update({ chat_summary: summary, chat_summary_at: new Date().toISOString() }).eq("id", resultId);
  if (error) console.warn(`채팅 요약 저장 실패: ${error.code}`);
}

export async function getResultForReport(resultId: string) {
  const { data, error } = await createAdminClient()
    .from(TABLE)
    .select("id, user_id, nickname, birth_input, answers, report")
    .eq("id", resultId)
    .maybeSingle();
  if (error) throw new Error(`결과 조회 실패: ${error.code}`);
  return data as { id: string; user_id: string | null; nickname: string; birth_input: BirthInput; answers: Answers; report: unknown } | null;
}
