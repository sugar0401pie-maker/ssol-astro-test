// 리포트 완성 메일(owner 2026-10-11 "리포트 생성되면 그 내용 메일로도"). 순수 함수 — 제목·글·HTML을 만든다.
// 출생 날짜·시간·장소는 넣지 않는다(리포트 본문에도 없음). 표·접힌 근거는 화면에서 보도록 안내하고, 고지문은 꼭 넣는다(8-1).
import type { Block } from "./paidSkeleton";

export interface ReportForEmail {
  sections: Array<{ no: number; title: string; summary: string | null; body: Block[]; tail: Block[] }>;
  questions: { headline: string; items: string[] };
  practices: Array<{ title: string; how: string }>;
  closing: string;
}

export const SUPPORT_EMAIL = "contact@ssolwellness.com";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function blockLines(b: Block): { kind: "head" | "p" | "li"; text: string }[] {
  switch (b.t) {
    case "head":
    case "sub":
      return [{ kind: "head", text: b.text.replace(/^•\s*/, "") }];
    case "items":
      return b.items.map((i) => ({ kind: "li" as const, text: `${i.title} — ${i.text}${i.note ? ` (${i.note})` : ""}` }));
    case "step":
      return [{ kind: "li", text: `${b.label} — ${b.text}` }];
    default:
      return [{ kind: "p", text: b.text }];
  }
}

export function buildReportEmail(args: { nickname: string; report: ReportForEmail; resultUrl: string; disclaimer: string }): { subject: string; text: string; html: string } {
  const { nickname, report, resultUrl, disclaimer } = args;
  const subject = `[쏠 아스트로 하우스] ${nickname}님의 별 리포트가 완성됐어요`;
  const text: string[] = [`${nickname}님, 별 리포트가 완성됐어요.`, `화면에서 표와 근거까지 함께 보기: ${resultUrl}`, ""];
  const html: string[] = [
    `<div style="font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#1b2440;line-height:1.7;max-width:600px;margin:0 auto">`,
    `<p style="font-size:18px;font-weight:700">${esc(nickname)}님, 별 리포트가 완성됐어요.</p>`,
    `<p><a href="${esc(resultUrl)}" style="color:#013566">화면에서 표와 근거까지 함께 보기</a></p>`,
  ];
  for (const s of [...report.sections].sort((a, b) => a.no - b.no)) {
    text.push(`■ ${s.no}. ${s.title}`);
    html.push(`<h2 style="font-size:17px;margin:28px 0 8px;color:#013566">${s.no}. ${esc(s.title)}</h2>`);
    if (s.summary) {
      text.push(s.summary);
      html.push(`<p style="font-weight:700">${esc(s.summary)}</p>`);
    }
    for (const line of [...s.body, ...s.tail].flatMap(blockLines)) {
      text.push(line.kind === "li" ? `· ${line.text}` : line.text);
      html.push(line.kind === "head" ? `<p style="font-weight:700;margin-top:16px">${esc(line.text)}</p>` : line.kind === "li" ? `<p style="margin:4px 0 4px 12px">· ${esc(line.text)}</p>` : `<p>${esc(line.text)}</p>`);
    }
    text.push("");
  }
  if (report.questions.items.length) {
    text.push("■ 별이 주는 질문", ...(report.questions.headline ? [report.questions.headline] : []), ...report.questions.items.map((q) => `· ${q}`), "");
    html.push(`<h2 style="font-size:17px;margin:28px 0 8px;color:#013566">별이 주는 질문</h2>`, ...(report.questions.headline ? [`<p>${esc(report.questions.headline)}</p>`] : []), ...report.questions.items.map((q) => `<p style="margin:4px 0 4px 12px">· ${esc(q)}</p>`));
  }
  if (report.practices.length) {
    text.push("■ 작은 실천", ...report.practices.map((p) => `· ${p.title} — ${p.how}`), "");
    html.push(`<h2 style="font-size:17px;margin:28px 0 8px;color:#013566">작은 실천</h2>`, ...report.practices.map((p) => `<p style="margin:4px 0 4px 12px">· <b>${esc(p.title)}</b> — ${esc(p.how)}</p>`));
  }
  if (report.closing) {
    text.push(report.closing, "");
    html.push(`<p style="margin-top:20px">${esc(report.closing)}</p>`);
  }
  text.push(disclaimer, `문의: ${SUPPORT_EMAIL}`);
  html.push(`<p style="font-size:12px;color:#6b7280;margin-top:28px">${esc(disclaimer)}</p>`, `<p style="font-size:12px;color:#6b7280">문의: ${SUPPORT_EMAIL}</p>`, `</div>`);
  return { subject, text: text.join("\n"), html: html.join("\n") };
}
