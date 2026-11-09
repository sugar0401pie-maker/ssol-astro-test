import { NextRequest, NextResponse } from "next/server";
import { adminState, gatePepper } from "@/lib/admin/data";
import { GATE_COOKIE, GATE_TTL_MS, passwordMatches, recordFailedTry, signGate, tooManyTries } from "@/lib/admin/gate";

// 관리자 2차 암호(owner 2026-11-09). GET = 지금 상태(login/locked/ok), POST {password} = 맞으면 12시간 쿠키.
// 암호는 Vercel 환경변수 ADMIN_PASSWORD에만 — 없으면 503(아무도 못 엶). 암호·입력값은 로그에 남기지 않는다.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const s = await adminState(req);
  return NextResponse.json({ state: s.state, configured: !!process.env.ADMIN_PASSWORD });
}

export async function POST(req: NextRequest) {
  const s = await adminState(req);
  if (s.state === "login") return NextResponse.json({ error: "관리자 계정으로 로그인해 주세요." }, { status: 403 });
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ error: "관리자 암호가 아직 설정되지 않았어요. Vercel에 ADMIN_PASSWORD를 넣어 주세요." }, { status: 503 });
  const now = Date.now();
  if (tooManyTries(s.userId, now)) return NextResponse.json({ error: "여러 번 틀려서 잠시 막혔어요. 10분 뒤 다시 해 주세요." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  if (!passwordMatches(password, expected)) {
    recordFailedTry(s.userId, now);
    return NextResponse.json({ error: "암호가 맞지 않아요." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, signGate(s.userId, now, expected, gatePepper()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(GATE_TTL_MS / 1000),
  });
  return res;
}
