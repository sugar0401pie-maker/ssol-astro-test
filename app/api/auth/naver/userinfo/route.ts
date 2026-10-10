import { NextRequest, NextResponse } from "next/server";
import { naverToOidc, type NaverMeResponse } from "@/lib/auth/naverUserinfo";

// Supabase 커스텀 OAuth(네이버, custom:naver)의 Userinfo URL로 쓰는 중간 주소.
// Supabase가 네이버에서 받은 액세스 토큰을 Authorization 헤더로 보내면, 그 토큰 그대로 네이버 사용자 정보를 받아
// Supabase가 읽을 수 있는 모양으로 바꿔 돌려준다. 저장·로그 없음(개인정보), 비밀값 없음(토큰은 받은 것을 전달만).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAVER_ME = "https://openapi.naver.com/v1/nid/me";

async function handle(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || !/^Bearer\s+\S+$/i.test(auth)) return NextResponse.json({ error: "missing token" }, { status: 401 });
  try {
    const res = await fetch(NAVER_ME, { headers: { authorization: auth }, cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as NaverMeResponse;
    const info = res.ok ? naverToOidc(body) : null;
    if (!info) return NextResponse.json({ error: "naver userinfo failed" }, { status: 401 });
    return NextResponse.json(info, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "naver unreachable" }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
