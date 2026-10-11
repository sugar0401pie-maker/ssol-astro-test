import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromAuthHeader } from "@/lib/supabase/auth";
import { getAccountEmail } from "@/lib/results/store";
import { buildMockReport, MOCK_NICKNAME } from "@/lib/results/mockReport";
import { buildReportEmail } from "@/lib/report/reportEmail";
import { findRow } from "@/lib/report/db";
import { ASTRO_DB } from "@/lib/report/dbData";
import { sendEmail } from "@/lib/email/resend";

// 리포트 메일 시험 발송(owner 2026-10-11). 로그인한 본인 계정 메일로만 보낸다(다른 주소로 보낼 수 없음),
// 같은 계정은 5분에 한 번. 시험이 끝나면 이 주소와 /mail-test 화면은 지워도 된다.
export const runtime = "nodejs";

const lastSent = new Map<string, number>();

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromAuthHeader(req.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const last = lastSent.get(userId) ?? 0;
  if (Date.now() - last < 5 * 60_000) return NextResponse.json({ error: "방금 보냈어요. 5분 뒤에 다시 시도해 주세요." }, { status: 429 });
  const to = await getAccountEmail(userId);
  if (!to) return NextResponse.json({ error: "이 계정에 등록된 메일 주소가 없어요." }, { status: 400 });
  try {
    const disclaimer = findRow(ASTRO_DB, "A15", (r) => r.id === "FIX_DISCLAIMER")?.text ?? "";
    const mail = buildReportEmail({ nickname: MOCK_NICKNAME, report: buildMockReport(), resultUrl: "https://astro.ssolwellnesshouse.com/", disclaimer });
    const sent = await sendEmail({ to, ...mail, subject: `[시험] ${mail.subject}` });
    if (!sent.ok) return NextResponse.json({ error: sent.reason === "no_api_key" ? "RESEND_API_KEY가 설정되지 않았어요." : `보내지 못했어요(${sent.reason}).` }, { status: 502 });
    lastSent.set(userId, Date.now());
    // 주소를 화면에 그대로 보이지 않게 앞부분만
    return NextResponse.json({ ok: true, to: to.replace(/^(.{3}).*(@.*)$/, "$1***$2") });
  } catch (e) {
    console.error("시험 메일 실패:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "목업 리포트를 만들지 못했어요." }, { status: 500 });
  }
}
