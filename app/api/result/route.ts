import { NextRequest, NextResponse } from "next/server";
import { computeFree, parseResultRequest } from "@/lib/results/compute";

// 결과를 보여 주기 전 확인용: 캐릭터 후보가 갈리면 후보(B6 카드)를, 정해졌으면 { ready: true }만 돌려준다.
// 결과 내용은 로그인·저장 동의 뒤 /api/results(POST)에서만 보낸다(마스터스펙 6-1 화면 6 '로그인·가입 후 결과' 초안).
// 아무것도 저장하지 않고, AI도 부르지 않는다.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const parsed = parseResultRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const c = computeFree(parsed.input, parsed.answers, parsed.nickname, { askTie: true });
    return NextResponse.json(c.kind === "result" ? { ready: true } : c.payload);
  } catch (e) {
    if (e instanceof RangeError) return NextResponse.json({ error: "고른 시간을 다시 확인해 주세요." }, { status: 400 });
    console.error("결과 확인 실패:", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({ error: "계산 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
