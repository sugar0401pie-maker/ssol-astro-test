import "server-only";
// 결제된 결과의 유료 리포트를 만들어 저장한다. 결제 승인 직후(after)와, 리포트를 열었는데 아직 없을 때(재시도) 부른다.
// 생성 자리를 먼저 잡아(claimReportGeneration) 같은 리포트를 동시에 두 번 만들지 않는다.
import { generatePaidReport } from "@/lib/report/aiReport";
import { ASTRO_DB } from "@/lib/report/dbData";
import { ASTRO_DB_EN } from "@/lib/report/dbDataEn";
import { wishContextOf } from "@/lib/astro/wish";
import { birthKeyOf } from "@/lib/report/variants";
import { computeFree } from "./compute";
import { chatSummaryFor } from "./chatSummary";
import { claimReportEmail, claimReportGeneration, getAccountEmail, getResultForReport, releaseReportEmail, saveChatSummary, savePartialReport, saveReport } from "./store";
import { findRow } from "@/lib/report/db";
import { buildReportEmail } from "@/lib/report/reportEmail";
import { sendEmail } from "@/lib/email/resend";
import { allPartsAi, generatedOnKstDay, usedDbFallback } from "@/lib/report/fallback";
import { createAdminClient } from "@/lib/supabase/admin";
import { kakaoArtUrl, pickSignArt, signArtChoices } from "@/lib/share/signShare";

const SITE_URL = "https://astro.ssolwellnesshouse.com";

/**
 * 리포트 완성 알림 메일(owner 2026-10-11: 본문 대신 카카오 공유 카드와 같은 별자리 카드 + 첫 장 링크).
 * 계정이 있고 메일 주소를 알 때만, 결과마다 한 번만. 로그인하지 않은(비회원) 결과는 보낼 주소가 없어 보내지 않는다.
 * 실패해도 리포트에는 영향 없다.
 */
async function emailReport(resultId: string, userId: string | null, nickname: string, card: { sunSign: string; sunSignIndex: number; oneLiner: string | null }): Promise<void> {
  // 메일 키가 없으면 자리를 잡지 않는다 — 키를 나중에 넣으면 그때 보낼 수 있게
  if (!userId || !process.env.RESEND_API_KEY) return;
  try {
    const to = await getAccountEmail(userId);
    if (!to || !(await claimReportEmail(resultId))) return;
    const art = pickSignArt(card.sunSignIndex) ?? signArtChoices(0)[0];
    const mail = buildReportEmail({
      nickname,
      sunSign: card.sunSign,
      oneLiner: card.oneLiner,
      imageUrl: kakaoArtUrl(art, SITE_URL),
      // 재방문 집계용 utm(owner 2026-10-15 링크 규칙)
      resultUrl: `${SITE_URL}/results/${resultId}/1?utm_source=email&utm_medium=report_mail`,
      disclaimer: findRow(ASTRO_DB, "A15", (r) => r.id === "FIX_DISCLAIMER")?.text ?? "",
    });
    const sent = await sendEmail({ to, ...mail });
    if (!sent.ok) await releaseReportEmail(resultId);
  } catch (e) {
    console.warn("리포트 메일 실패:", e instanceof Error ? e.name : "unknown");
  }
}

/** 결과(계산값)에서 메일 카드 정보 */
function cardOf(c: Extract<ReturnType<typeof computeFree>, { kind: "result" }>) {
  return { sunSign: c.result.sunSign, sunSignIndex: c.result.sunSignIndex, oneLiner: c.result.sunSignIntro?.oneLiner ?? null };
}

/**
 * 재시도(화면이 30초 동안 아무것도 못 받았을 때)여도 서버는 2분 넘게 멈춘 생성만 다시 시작한다(평소엔 5분).
 * 정상 생성도 20~60초가 걸려서, 30초에 다시 시작하면 같은 리포트를 두 번 만들게 된다(AI 비용 두 배).
 */
export const RETRY_STALE_MS = 120_000;

export async function runReportGeneration(resultId: string, opts: { retry?: boolean } = {}): Promise<void> {
  const attempt = await claimReportGeneration(resultId, opts.retry ? RETRY_STALE_MS : undefined);
  if (!attempt) return; // 이미 만드는 중이거나 끝남(또는 방금 실패해 잠시 쉬는 중)
  try {
    const row = await getResultForReport(resultId);
    if (!row) throw new Error("결과 없음");
    // 영문판 결과(2026-11-04): 영문 DB + 영문 AI 지시문·영문 검증기(실패하면 그 파트는 영문 DB 문장 뼈대)
    const en = row.birth_input.lang === "en";
    const c = computeFree(row.birth_input, row.answers, row.nickname, { lang: en ? "en" : "ko" });
    if (c.kind !== "result") throw new Error("결과를 다시 계산하지 못함");
    const report = await generatePaidReport({ db: en ? ASTRO_DB_EN : ASTRO_DB, lang: en ? "en" : "ko", resolved: c.birth.resolved, wishContext: wishContextOf(c.birth.stored, c.birth.accuracy), answers: row.answers, nickname: row.nickname, birthKey: birthKeyOf(row.birth_input), onPart: (partial) => savePartialReport(resultId, partial, attempt) });
    // 그사이 다른 시도가 자리를 넘겨받았으면 저장하지 않는다(그쪽 결과가 남는다)
    if (!(await saveReport(resultId, report, attempt))) return;
    // 주인을 다시 읽는다: 생성 중(20~60초)에 비회원이 로그인해 계정으로 옮겼으면, 시작할 때 읽은 user_id는 비어 있고
    // 옮기는 순간(claim)의 메일 확인은 리포트가 아직 없어 건너뛰었기 때문(메일은 claimReportEmail로 한 번만 나간다).
    // 영문 리포트 완성 메일·쏘웰라 요약은 영문판 작업 전이라 보내지 않는다(한국어 메일·요약이 나가지 않게)
    if (en) return;
    const owner = (await getResultForReport(resultId).catch(() => null))?.user_id ?? row.user_id;
    await emailReport(resultId, owner, row.nickname, cardOf(c));
    // 쏘웰라 채팅이 참고할 요약을 리포트 본문·제안까지 넣어 다시 만든다.
    await saveChatSummary(resultId, chatSummaryFor(c, row.answers, report, row.nickname));
  } catch (e) {
    console.error("유료 리포트 생성 실패:", e instanceof Error ? e.message : "unknown");
    await saveReport(resultId, null, attempt).catch(() => {});
  }
}

/** 비회원으로 결제한 결과를 로그인해 계정으로 옮긴 뒤: 리포트가 이미 있고 아직 메일을 안 보냈으면 보낸다. */
export async function emailReportIfReady(resultId: string): Promise<void> {
  try {
    const row = await getResultForReport(resultId);
    if (!row || row.report_status !== "ready" || !row.report || row.birth_input.lang === "en") return;
    const c = computeFree(row.birth_input, row.answers, row.nickname, { lang: "ko" });
    if (c.kind !== "result") return;
    await emailReport(resultId, row.user_id, row.nickname, cardOf(c));
  } catch (e) {
    console.warn("리포트 메일 확인 실패:", e instanceof Error ? e.name : "unknown");
  }
}

// ── AI 없이 나간 리포트 다시 만들기(owner 2026-11-08: OpenAI 키가 막혀 있던 동안 해석 DB 문장만으로 나간 결제 리포트를
//    새 키로 다시 써서 고객에게 다시 보낸다). 관리자 화면(/admin/reports)에서만 부른다.

export interface FallbackItem { id: string; paidAt: string | null; lang: "ko" | "en"; member: boolean }

/** AI 없이 나간 결제 리포트 목록(최근 결제 순). 리포트 본문·개인정보는 돌려주지 않는다. */
/** day(YYYY-MM-DD, 한국 날짜)를 주면 그날 만들어진 리포트만 */
export async function listFallbackReports(day = ""): Promise<FallbackItem[]> {
  const out: FallbackItem[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await createAdminClient()
      .from("astro_results")
      .select("id, paid_at, user_id, birth_input, report")
      .not("paid_at", "is", null)
      .eq("report_status", "ready")
      .order("paid_at", { ascending: false })
      .range(from, from + 499);
    if (error) throw new Error(`목록 조회 실패: ${error.code}`);
    for (const r of data ?? []) {
      if (!usedDbFallback(r.report)) continue;
      if (day && !generatedOnKstDay(r.report, day)) continue;
      out.push({ id: r.id as string, paidAt: (r.paid_at as string) ?? null, lang: (r.birth_input as { lang?: string })?.lang === "en" ? "en" : "ko", member: !!r.user_id });
    }
    if (!data || data.length < 500) return out;
  }
}

export type RedoResult = "redone_emailed" | "redone_no_email" | "ai_still_failing" | "skipped";

/**
 * 한 건 다시 만들기. 모든 파트가 AI로 써졌을 때만 저장한다 — AI가 아직 안 되면 기존 리포트를 그대로 두고 'ai_still_failing'.
 * 저장하면 계정이 있는 한국어 결과에 '다시 다듬었다' 메일을 보낸다(이전에 완성 메일을 받았어도). 비회원은 주소가 없어 리포트만 바뀐다.
 */
export async function redoFallbackReport(resultId: string): Promise<RedoResult> {
  const row = await getResultForReport(resultId);
  if (!row || row.report_status !== "ready" || !usedDbFallback(row.report)) return "skipped";
  const en = row.birth_input.lang === "en";
  const c = computeFree(row.birth_input, row.answers, row.nickname, { lang: en ? "en" : "ko" });
  if (c.kind !== "result") return "skipped";
  const report = await generatePaidReport({ db: en ? ASTRO_DB_EN : ASTRO_DB, lang: en ? "en" : "ko", resolved: c.birth.resolved, wishContext: wishContextOf(c.birth.stored, c.birth.accuracy), answers: row.answers, nickname: row.nickname, birthKey: birthKeyOf(row.birth_input) });
  if (!allPartsAi(report)) return "ai_still_failing";
  if (!(await saveReport(resultId, report))) return "skipped";
  if (en) return "redone_no_email"; // 영문 완성 메일은 아직 없음
  await saveChatSummary(resultId, chatSummaryFor(c, row.answers, report, row.nickname));
  if (!row.user_id || !process.env.RESEND_API_KEY) return "redone_no_email";
  const to = await getAccountEmail(row.user_id);
  if (!to) return "redone_no_email";
  const card = cardOf(c);
  const art = pickSignArt(card.sunSignIndex) ?? signArtChoices(0)[0];
  const mail = buildReportEmail({
    nickname: row.nickname,
    sunSign: card.sunSign,
    oneLiner: card.oneLiner,
    imageUrl: kakaoArtUrl(art, SITE_URL),
    resultUrl: `${SITE_URL}/results/${resultId}/4?utm_source=email&utm_medium=report_redo`,
    disclaimer: findRow(ASTRO_DB, "A15", (r) => r.id === "FIX_DISCLAIMER")?.text ?? "",
  });
  const note = `${row.nickname}님, 처음 보내 드린 리포트가 저희 쪽 문제로 일부 내용이 충분히 다듬어지지 않은 채 나갔어요. 다시 정성껏 써서 보내 드려요. 늦어져서 죄송합니다.`;
  const sent = await sendEmail({
    to,
    subject: `[쏠 아스트로 하우스] ${row.nickname}님의 별 리포트를 다시 다듬어 보내 드려요`,
    text: `${note}\n\n${mail.text}`,
    html: `<p style="font-size:15px;line-height:1.7;margin:0 0 16px">${note.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]!)}</p>${mail.html}`,
  });
  return sent.ok ? "redone_emailed" : "redone_no_email";
}
