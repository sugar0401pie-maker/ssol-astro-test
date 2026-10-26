import "server-only";
// 결과 저장 IP 기록(saveLimit.ts 참고). IP 그대로는 어디에도 저장하지 않는다 — 서버 비밀값으로 만든 HMAC만.
// (IP 주소는 경우의 수가 적어 그냥 sha256이면 되돌려 찾을 수 있으므로 비밀값을 섞는다.)
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAY_MS, WEEK_MS } from "./saveLimit";

const TABLE = "astro_save_ip_log";

/** IP_HASH_SECRET(없으면 service role 키)으로 만든 해시. 비밀값이 없으면 null(→ 메모리 한도만). */
export function ipHash(ip: string): string | null {
  const secret = process.env.IP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createHmac("sha256", secret).update(`astro-save-ip:${ip}`).digest("hex");
}

/** 최근 24시간·7일 저장 수. 표가 없거나(마이그레이션 전) 실패하면 null. */
export async function countIpSaves(hash: string, now = Date.now()): Promise<{ day: number; week: number } | null> {
  const db = createAdminClient();
  const { data, error } = await db.from(TABLE).select("created_at").eq("ip_hash", hash).gte("created_at", new Date(now - WEEK_MS).toISOString()).limit(1000);
  if (error) return null;
  const rows = (data ?? []) as Array<{ created_at: string }>;
  const dayStart = now - DAY_MS;
  return { day: rows.filter((r) => Date.parse(r.created_at) >= dayStart).length, week: rows.length };
}

/** 저장 한 건 기록(실패해도 저장 결과에는 영향 없음) */
export async function recordIpSave(hash: string): Promise<void> {
  const { error } = await createAdminClient().from(TABLE).insert({ ip_hash: hash });
  if (error && error.code !== "42P01") console.warn(`IP 기록 실패: ${error.code}`);
}

/** 7일 지난 기록 지우기(하루 한 번 정리 작업) */
export async function deleteOldIpSaves(now = Date.now()): Promise<number> {
  const { count, error } = await createAdminClient().from(TABLE).delete({ count: "exact" }).lt("created_at", new Date(now - WEEK_MS).toISOString());
  if (error) {
    if (error.code === "42P01") return 0;
    throw new Error(`IP 기록 정리 실패: ${error.code}`);
  }
  return count ?? 0;
}
