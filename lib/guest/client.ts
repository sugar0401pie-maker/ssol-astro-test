"use client";

// 비회원 열쇠(브라우저 쪽). 로그인하지 않고 본 결과를 이 기기에서 다시 열고 결제하려면 이 열쇠가 필요하다.
// 이 사이트 저장소(localStorage, astro. 도메인 전용)에만 둔다 — 공유 로그인 쿠키와 섞지 않는다.
// 서버는 열쇠의 해시만 저장한다(lib/results/guest.ts). 가입·로그인하면 열쇠로 묶인 결과가 계정으로 옮겨진다.
import type { Session } from "@supabase/supabase-js";

const KEY = "astro_guest_v1";
export const GUEST_HEADER = "x-astro-guest";
let memoryToken: string | null = null; // 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 이 탭에서만

function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function getGuestToken(create: boolean): string | null {
  try {
    let t = localStorage.getItem(KEY);
    if (!t && create) {
      t = newToken();
      localStorage.setItem(KEY, t);
    }
    return t;
  } catch {
    if (!memoryToken && create) memoryToken = newToken();
    return memoryToken;
  }
}

/** API 요청 헤더: 로그인했으면 로그인 토큰(+ 옮기기용 열쇠), 아니면 비회원 열쇠(없으면 만든다). */
export function apiHeaders(session: Session | null | undefined, extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  const token = getGuestToken(!session);
  if (session) h.authorization = `Bearer ${session.access_token}`;
  if (token) h[GUEST_HEADER] = token;
  return h;
}

let claimedFor: string | null = null;

/** 로그인 직후 이 브라우저의 비회원 결과를 계정으로 옮긴다(페이지마다 한 번). 옮긴 수. */
export async function claimGuestResults(session: Session): Promise<number> {
  const token = getGuestToken(false);
  if (!token || claimedFor === session.user.id) return 0;
  claimedFor = session.user.id;
  try {
    const res = await fetch("/api/results/claim", { method: "POST", headers: apiHeaders(session) });
    const d = (await res.json().catch(() => ({}))) as { claimed?: number };
    return res.ok ? d.claimed ?? 0 : 0;
  } catch {
    claimedFor = null; // 다음 기회에 다시
    return 0;
  }
}
