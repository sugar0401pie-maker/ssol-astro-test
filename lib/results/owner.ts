import "server-only";
// 결과·주문의 주인 확인: 로그인한 사용자(Bearer 토큰)가 먼저, 없으면 비회원 열쇠(x-astro-guest 헤더).
import { getUserIdFromAuthHeader } from "@/lib/supabase/auth";
import { GUEST_HEADER, hashGuestToken, isGuestToken } from "./guest";

export type Owner = { kind: "user"; userId: string } | { kind: "guest"; tokenHash: string };

export async function resolveOwner(headers: Headers): Promise<Owner | null> {
  const userId = await getUserIdFromAuthHeader(headers.get("authorization"));
  if (userId) return { kind: "user", userId };
  const token = headers.get(GUEST_HEADER);
  return isGuestToken(token) ? { kind: "guest", tokenHash: hashGuestToken(token) } : null;
}

/** 로그인한 사용자가 함께 보낸 비회원 열쇠(계정으로 옮기기용). */
export function guestHashFrom(headers: Headers): string | null {
  const token = headers.get(GUEST_HEADER);
  return isGuestToken(token) ? hashGuestToken(token) : null;
}
