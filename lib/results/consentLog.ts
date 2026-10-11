import "server-only";
// 계정별 동의 기록(owner 결정 2026-10-11): 어떤 항목·어떤 문구 버전에 언제 동의했는지 한 줄씩 남긴다.
// 비회원은 열쇠 해시로 남기고 로그인하면 계정으로 옮긴다(마스터스펙 8-4: 임시 계정의 동의 기록은 계정으로 옮긴다).
// 기록 실패는 저장·결제를 막지 않는다(동의 자체는 화면·서버에서 이미 확인했고, 결과 행의 consent_version에도 남는다) — 코드만 로그.
import { createAdminClient } from "@/lib/supabase/admin";
import type { Owner } from "./owner";

export type ConsentKey = "age" | "privacy" | "terms" | "store" | "withdrawal_limit";

export async function recordConsents(owner: Owner, keys: ConsentKey[], version: string, link: { resultId?: string; orderId?: string } = {}): Promise<void> {
  if (!keys.length) return;
  const who = owner.kind === "user" ? { user_id: owner.userId } : { user_id: null, guest_token_hash: owner.tokenHash };
  const rows = keys.map((k) => ({ ...who, consent_key: k, version, result_id: link.resultId ?? null, order_id: link.orderId ?? null }));
  try {
    const { error } = await createAdminClient().from("astro_consents").insert(rows);
    if (error) console.warn("동의 기록 실패:", error.code);
  } catch (e) {
    console.warn("동의 기록 실패:", e instanceof Error ? e.name : "unknown");
  }
}

/** 로그인 직후 이 브라우저의 비회원 동의 기록을 계정으로 옮긴다. */
export async function claimGuestConsents(userId: string, tokenHash: string): Promise<void> {
  const { error } = await createAdminClient().from("astro_consents").update({ user_id: userId, guest_token_hash: null }).is("user_id", null).eq("guest_token_hash", tokenHash);
  if (error) console.warn("동의 기록 옮기기 실패:", error.code);
}
