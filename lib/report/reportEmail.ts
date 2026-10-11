// 리포트 완성 알림 메일(owner 2026-10-11): 본문 전체 대신 카카오톡 공유 카드와 같은 별자리 카드(그림·별자리·소개 두 줄)
// + [리포트 보러 가기] 링크. 링크는 결제했어도 첫 장(태어난 순간의 하늘)부터 열린다. 순수 함수.
// 출생 날짜·시간·장소는 넣지 않는다(태양 별자리는 공유 카드와 같이 넣음 — owner 결정). 고지문은 꼭 넣는다(8-1).
import { balancedTwoLines } from "../share/signShare.ts";

export const SUPPORT_EMAIL = "contact@ssolwellness.com";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface ReportMailInput {
  nickname: string;
  sunSign: string;
  /** A1 one_liner(없으면 별자리 이름만) */
  oneLiner: string | null;
  /** 카드 그림(사이트 절대 주소의 jpg — 카카오 카드와 같은 그림) */
  imageUrl: string;
  /** 첫 장으로 가는 결과 주소 */
  resultUrl: string;
  disclaimer: string;
}

export function buildReportEmail(m: ReportMailInput): { subject: string; text: string; html: string } {
  const subject = `[쏠 아스트로 하우스] ${m.nickname}님의 별 리포트가 완성됐어요`;
  const lines = m.oneLiner ? balancedTwoLines(m.oneLiner).split("\n") : [];
  const lead = `${m.nickname}님의 별 리포트가 완성됐어요. 아래 버튼을 눌러 첫 장부터 천천히 읽어 보세요.`;
  const loginNote = "리포트는 결제한 계정으로 로그인하면 볼 수 있어요.";
  const text = [lead, "", `${m.sunSign} — 쏠 아스트로 하우스`, ...lines, "", `리포트 보러 가기: ${m.resultUrl}`, loginNote, "", m.disclaimer, `문의: ${SUPPORT_EMAIL}`].join("\n");
  const html = [
    `<div style="font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#1b2440;line-height:1.7;max-width:480px;margin:0 auto;padding:16px">`,
    `<p style="font-size:16px">${esc(lead)}</p>`,
    `<a href="${esc(m.resultUrl)}" style="display:block;text-decoration:none;color:inherit;border:1px solid #e6dcc6;border-radius:16px;overflow:hidden;background:#fff">`,
    `<img src="${esc(m.imageUrl)}" alt="${esc(m.sunSign)} 그림" width="480" height="480" style="display:block;width:100%;height:auto;border:0">`,
    `<div style="padding:14px 16px">`,
    `<p style="margin:0;font-size:17px;font-weight:700;color:#013566">${esc(m.sunSign)} — 쏠 아스트로 하우스</p>`,
    lines.length ? `<p style="margin:6px 0 0;font-size:14px;color:#4b5563">${lines.map(esc).join("<br>")}</p>` : "",
    `</div></a>`,
    `<p style="text-align:center;margin:20px 0 8px"><a href="${esc(m.resultUrl)}" style="display:inline-block;background:#013566;color:#FDF6E9;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:999px">리포트 보러 가기</a></p>`,
    `<p style="text-align:center;font-size:13px;color:#6b7280;margin:0">${esc(loginNote)}</p>`,
    `<p style="font-size:12px;color:#6b7280;margin-top:28px">${esc(m.disclaimer)}</p>`,
    `<p style="font-size:12px;color:#6b7280">문의: ${SUPPORT_EMAIL}</p>`,
    `</div>`,
  ].join("\n");
  return { subject, text, html };
}
