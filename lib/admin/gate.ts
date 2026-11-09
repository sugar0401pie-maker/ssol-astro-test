// 관리자 화면 2차 암호(owner 2026-11-09): 관리자 계정으로 로그인했더라도 암호를 한 번 더 넣어야 /admin 숫자·엑셀·다시 만들기를 쓴다.
// 암호 자체는 코드에 두지 않는다 — Vercel 환경변수 ADMIN_PASSWORD에만. 없으면 아무도 못 연다(fail closed).
// 맞히면 12시간짜리 서명 쿠키(httpOnly)를 준다. 서명 열쇠는 암호에서 만들어서, 암호를 바꾸면 이전 쿠키는 모두 무효.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const GATE_COOKIE = "astro_admin_gate";
export const GATE_TTL_MS = 12 * 60 * 60 * 1000;

const sha = (s: string) => createHash("sha256").update(s).digest();

/** 길이가 달라도 시간이 같게 비교(해시끼리 비교) */
export function passwordMatches(input: string, expected: string | undefined): boolean {
  if (!expected || typeof input !== "string" || !input) return false;
  return timingSafeEqual(sha(input), sha(expected));
}

function key(password: string, pepper: string): Buffer {
  return sha(`astro-admin-gate:${password}:${pepper}`);
}

function mac(userId: string, exp: number, password: string, pepper: string): string {
  return createHmac("sha256", key(password, pepper)).update(`${userId}.${exp}`).digest("base64url");
}

/** 쿠키 값 = "만료시각.서명" (계정 id에 묶임) */
export function signGate(userId: string, now: number, password: string, pepper: string): string {
  const exp = now + GATE_TTL_MS;
  return `${exp}.${mac(userId, exp, password, pepper)}`;
}

export function verifyGate(token: string | undefined, userId: string, now: number, password: string | undefined, pepper: string): boolean {
  if (!token || !password) return false;
  const m = /^(\d{10,16})\.([A-Za-z0-9_-]{20,})$/.exec(token);
  if (!m) return false;
  const exp = Number(m[1]);
  if (!(exp > now) || exp - now > GATE_TTL_MS) return false;
  const want = Buffer.from(mac(userId, exp, password, pepper));
  const got = Buffer.from(m[2]);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** 틀린 암호 시도 제한: 같은 계정 10분에 5번(서버 인스턴스 메모리, 최선 노력) */
const tries = new Map<string, number[]>();
export function tooManyTries(userId: string, now: number, limit = 5, windowMs = 10 * 60 * 1000): boolean {
  const list = (tries.get(userId) ?? []).filter((t) => now - t < windowMs);
  tries.set(userId, list);
  return list.length >= limit;
}
export function recordFailedTry(userId: string, now: number): void {
  tries.set(userId, [...(tries.get(userId) ?? []), now]);
}
