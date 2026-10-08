import "server-only";
// 유료 리포트 생성(마스터스펙 7-4): 연말·2027·5년+질문 3파트를 병렬로 부르고, 파트마다 자동 검증 →
// 실패하면 그 파트만 1회 재생성 → 그래도 실패하거나 모델 호출이 안 되면 DB 뼈대 문장으로(fail safe).
// 모델은 스펙 이름(GPT-6.1 Sol)을 기본으로, 실제 모델 ID가 다르면 REPORT_MODEL 환경변수로 바꾼다.
// AI 호출은 이 파일 한 곳에서만 한다(제공사·모델 교체 지점).
import OpenAI from "openai";
import { CHARACTER_GRID } from "@/lib/astro/constants";
import type { Answers } from "@/lib/astro/answers";
import type { BirthResult } from "@/lib/astro/birth";
import { buildTimeline, periodWindows, selectPeriods } from "@/lib/astro/timeline";
import { computeWish, type WishContext } from "@/lib/astro/wish";
import { PARTS, fillSystemPrompt, partUserMessage, processPartOutput, type PartId } from "./aiPrompt";
import { findRow, type AstroDb } from "./db";
import { buildPaidSkeleton, type PaidSection } from "./paidSkeleton";
import { buildReportInput } from "./reportInput";
import { compileC1, type C1Row } from "./validate";

/** 당분간 화면 비노출(show_character=false) — AI 출력에 나오면 그 파트를 다시 만든다. */
const CHARACTER_NAMES = Object.values(CHARACTER_GRID).flat();

export const REPORT_MODEL = process.env.REPORT_MODEL || "gpt-6.1-sol";

export interface PaidReport {
  sections: Array<PaidSection & { source: "ai" | "db" }>;
  questions: { headline: string; items: string[]; why: string | null };
  practices: Array<{ title: string; how: string; why: string; condition: string; minutes: string }>;
  closing: string;
  model: string;
  generatedAt: string;
}

type Resolved = NonNullable<BirthResult["resolved"]>;

async function callModel(system: string, user: string): Promise<string> {
  const client = new OpenAI({ timeout: 90_000, maxRetries: 0 });
  const res = await client.responses.create({
    model: REPORT_MODEL,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_output_tokens: 4000,
  });
  const text = res.output_text?.trim();
  if (!text) throw new Error("빈 응답");
  return text;
}

export async function generatePaidReport(args: { db: AstroDb; resolved: Resolved; wishContext: WishContext; answers: Answers; nickname: string; now?: Date }): Promise<PaidReport> {
  const { db, resolved, answers, nickname } = args;
  const now = args.now ?? new Date();
  const { chart, longitudes: L, character } = resolved;
  const windows = periodWindows(now);
  const events = buildTimeline(L, { start: "2026-01-01", end: "2031-12-31" }, windows.eoy);
  const periods = selectPeriods(events, answers.q1, now);
  const wish = computeWish(L, answers.q3, args.wishContext);
  const skeleton = buildPaidSkeleton({ db, chart, longitudes: L, character, answers, events, periods, wish, nickname });
  const typeLine = findRow(db, "A5", (r) => r.character === character.name)?.type_line ?? "";
  const built = buildReportInput({ nickname, chart, character, answers, periods, wish, typeLine });
  const c1 = compileC1(db.dbs.C1.rows as unknown as C1Row[]);

  const runPart = async (part: PartId) => {
    const dbSentences = PARTS[part].sections.flatMap((n) => skeleton.dbSentences[n]);
    built.input.db_sentences = dbSentences;
    const system = fillSystemPrompt(built, dbSentences);
    const user = partUserMessage(built, part);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const out = processPartOutput(await callModel(system, user), part, built, c1, CHARACTER_NAMES);
        if (out.ok) return out.sections;
        // 실패 사유는 코드만 남긴다(문장·개인정보는 로그에 남기지 않음).
        console.warn(`리포트 파트 ${part} 검증 실패(${attempt + 1}회):`, out.issues.filter((i) => i.severity !== "경고").map((i) => i.code).join(","));
      } catch (e) {
        console.warn(`리포트 파트 ${part} 생성 실패(${attempt + 1}회):`, e instanceof Error ? e.name : "unknown");
      }
    }
    return null; // DB 뼈대로
  };

  const [a, b, c] = await Promise.all((["A", "B", "C"] as PartId[]).map(runPart));
  const ai: Partial<Record<4 | 5 | 6 | 7, string[]>> = { ...(a ?? {}), ...(b ?? {}), ...(c ?? {}) };
  return {
    sections: skeleton.sections.map((s) => (ai[s.no]?.length ? { ...s, paragraphs: ai[s.no]!, source: "ai" as const } : { ...s, source: "db" as const })),
    questions: skeleton.questions,
    practices: skeleton.practices,
    closing: skeleton.closing,
    model: [a, b, c].some(Boolean) ? REPORT_MODEL : "db-only",
    generatedAt: now.toISOString(),
  };
}
