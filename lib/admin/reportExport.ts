// 관리자: 사용자에게 나간 유료 리포트(4~7장) 본문을 엑셀(CSV) 줄로 펼치기(owner 2026-11-10). 순수 함수.
// 한 리포트 = 장마다 한 줄 + '질문·실천·맺음말' 한 줄. 무료 결과(1~3장)는 저장된 글이 없어 여기 없다.
import { kstStamp } from "./stats.ts";

type Block = { t: string; text?: string; label?: string; items?: Array<{ title?: string; text?: string }> };

type Section = { no?: number; title?: string; source?: string; summary?: string | null; body?: Block[]; tail?: Block[] };

export type StoredReport = {
  sections?: Section[];
  questions?: { headline?: string; items?: string[] };
  practices?: Array<{ title?: string; how?: string }>;
  closing?: string;
  generatedAt?: string;
  partial?: boolean;
};

export const REPORT_HEADER = [
  "결과_id", "만든_시각(한국)", "언어", "Q1_고민영역", "Q2_2026_한단어", "Q3_2027_바람",
  "장", "장_제목", "출처(ai/db)", "굵은_요약", "본문",
];

export function blockLine(b: Block): string {
  if (b.t === "items") return (b.items ?? []).map((i) => `${i.title ?? ""} — ${i.text ?? ""}`).join("\n");
  if (b.t === "step") return `${b.label ?? ""}: ${b.text ?? ""}`;
  return b.text ?? "";
}

export function reportRows(
  meta: { id: string; lang?: string; answers?: { q1?: string; q2?: string; q3?: string } | null },
  report: StoredReport | null,
): unknown[][] {
  if (!report || report.partial || !Array.isArray(report.sections)) return [];
  const a = meta.answers ?? {};
  const head = [meta.id, kstStamp(report.generatedAt), meta.lang === "en" ? "영문" : "한국어", a.q1 ?? "", a.q2 ?? "", a.q3 ?? ""];
  const rows: unknown[][] = report.sections.map((s) => [
    ...head,
    s.no ?? "",
    s.title ?? "",
    s.source ?? "",
    s.summary ?? "",
    [...(s.body ?? []), ...(s.tail ?? [])].map(blockLine).filter((t) => t.trim()).join("\n\n"),
  ]);
  const q = (report.questions?.items ?? []).map((x) => `· ${x}`).join("\n");
  const p = (report.practices ?? []).map((x) => `${x.title ?? ""} — ${x.how ?? ""}`).join("\n");
  rows.push([...head, 8, "질문·실천·맺음말", "db", report.questions?.headline ?? "", [q, p, report.closing ?? ""].filter(Boolean).join("\n\n")]);
  return rows;
}
