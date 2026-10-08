// 비회원(로그인 없이) 결과의 주인 확인용 열쇠 — 순수 함수(서버·테스트 공용).
// 브라우저가 무작위 열쇠를 만들어 이 사이트 저장소(localStorage)에만 두고 요청마다 헤더로 보낸다. 서버는 해시만 저장·비교한다
// (DB가 새어도 열쇠를 되살릴 수 없게). Supabase 익명 로그인은 쓰지 않는다 — 공유 로그인 쿠키를 쏘웰라가 익명이면 지우기 때문.
import { createHash } from "node:crypto";

export const GUEST_HEADER = "x-astro-guest";

/** 브라우저가 만드는 열쇠 모양: base64url 43자 이상(32바이트 무작위). 그 밖의 값은 받지 않는다. */
export function isGuestToken(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{43,128}$/.test(v);
}

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(`astro-guest:${token}`).digest("hex");
}

/** 익명 결과 보관 기간(owner 확정 전 초안): 결제 전 30일, 결제 후 1년. 그 전에 가입·로그인하면 계정으로 옮겨져 기한이 없어진다. */
export const GUEST_KEEP_DAYS = 30;
export const GUEST_PAID_KEEP_DAYS = 365;

export function guestExpiry(now: Date, paid: boolean): string {
  return new Date(now.getTime() + (paid ? GUEST_PAID_KEEP_DAYS : GUEST_KEEP_DAYS) * 86_400_000).toISOString();
}
