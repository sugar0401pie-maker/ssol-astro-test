import "server-only";
// 결제된 결과의 유료 리포트를 만들어 저장한다. 결제 승인 직후(after)와, 리포트를 열었는데 아직 없을 때(재시도) 부른다.
// 생성 자리를 먼저 잡아(claimReportGeneration) 같은 리포트를 동시에 두 번 만들지 않는다.
import { generatePaidReport } from "@/lib/report/aiReport";
import { ASTRO_DB } from "@/lib/report/dbData";
import { wishContextOf } from "@/lib/astro/wish";
import { birthKeyOf } from "@/lib/report/variants";
import { computeFree } from "./compute";
import { chatSummaryFor } from "./chatSummary";
import { claimReportEmail, claimReportGeneration, getAccountEmail, getResultForReport, releaseReportEmail, saveChatSummary, savePartialReport, saveReport } from "./store";
import { findRow } from "@/lib/report/db";
import { buildReportEmail } from "@/lib/report/reportEmail";
import { sendEmail } from "@/lib/email/resend";
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
      resultUrl: `${SITE_URL}/results/${resultId}/1`,
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
    const c = computeFree(row.birth_input, row.answers, row.nickname);
    if (c.kind !== "result") throw new Error("결과를 다시 계산하지 못함");
    const report = await generatePaidReport({ db: ASTRO_DB, resolved: c.birth.resolved, wishContext: wishContextOf(c.birth.stored, c.birth.accuracy), answers: row.answers, nickname: row.nickname, birthKey: birthKeyOf(row.birth_input), onPart: (partial) => savePartialReport(resultId, partial, attempt) });
    // 그사이 다른 시도가 자리를 넘겨받았으면 저장하지 않는다(그쪽 결과가 남는다)
    if (!(await saveReport(resultId, report, attempt))) return;
    await emailReport(resultId, row.user_id, row.nickname, cardOf(c));
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
    if (!row || row.report_status !== "ready" || !row.report) return;
    const c = computeFree(row.birth_input, row.answers, row.nickname);
    if (c.kind !== "result") return;
    await emailReport(resultId, row.user_id, row.nickname, cardOf(c));
  } catch (e) {
    console.warn("리포트 메일 확인 실패:", e instanceof Error ? e.name : "unknown");
  }
}
