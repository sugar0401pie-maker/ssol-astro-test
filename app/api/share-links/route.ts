import { NextRequest, NextResponse } from "next/server";
import { resolveOwner } from "@/lib/results/owner";
import { insertShareLink } from "@/lib/results/store";
import { isShareChannel, SLUG_RE } from "@/lib/attribution/attribution";

// 공유 링크 코드 기록(owner 2026-10-15): 공유 버튼을 누르는 순간 브라우저가 만든 무작위 코드를 채널·공유한 사람·결과와 함께 남긴다.
// 공유는 이 기록을 기다리지 않는다(휴대폰 공유창은 버튼을 누른 직후에만 열려서) — 그래서 실패해도 늘 204.
// 들어온 사람 쪽에는 공유한 사람이 누구인지 보이지 않는다(코드는 무작위, 이 표는 서버만 읽음).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (text.length > 500) return new NextResponse(null, { status: 204 });
    const body = JSON.parse(text) as { slug?: unknown; channel?: unknown; resultId?: unknown };
    if (typeof body.slug !== "string" || !SLUG_RE.test(body.slug) || !isShareChannel(body.channel)) return new NextResponse(null, { status: 204 });
    const owner = await resolveOwner(req.headers);
    const r = await insertShareLink(owner, body.slug, body.channel, typeof body.resultId === "string" ? body.resultId : null);
    if (r === "unavailable") console.warn("공유 링크 표 없음(마이그레이션 20261015000000 전)");
  } catch (e) {
    console.warn(e instanceof Error ? e.message : "공유 링크 기록 실패");
  }
  return new NextResponse(null, { status: 204 });
}
