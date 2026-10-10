import "server-only";
// 유료 리포트 생성(마스터스펙 7-4): 연말·2027·5년+질문 3파트를 병렬로 부르고, 파트마다 자동 검증 →
// 실패하면 그 파트만 1회 재생성 → 그래도 실패하거나 모델 호출이 안 되면 DB 뼈대 문장으로(fail safe).
// 모델은 스펙 이름(GPT-6.1 Sol)을 기본으로, 실제 모델 ID가 다르면 REPORT_MODEL 환경변수로 바꾼다.
// AI 호출은 이 파일 한 곳에서만 한다(제공사·모델 교체 지점).
import OpenAI from "openai";
import { CHARACTER_GRID } from "@/lib/astro/constants";
import type { Answers } from "@/lib/astro/answers";
import type { WishContext } from "@/lib/astro/wish";
import { PARTS, fillSystemPrompt, partUserMessage, processPartOutput, type PartId, type SectionNo } from "./aiPrompt";
import { findRow, type AstroDb } from "./db";
import { judgementSentence, type Block, type PaidSection } from "./paidSkeleton";
import { prepareSkeleton, type Resolved } from "./prepare";
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
  /** 아직 쓰는 중인 리포트(다 쓴 파트의 섹션만 들어 있음, B14 EMPTY_REPORT_GEN '다 쓴 부분부터 차례로') */
  partial?: boolean;
}


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

export async function generatePaidReport(args: {
  db: AstroDb;
  resolved: Resolved;
  wishContext: WishContext;
  answers: Answers;
  nickname: string;
  birthKey?: string;
  now?: Date;
  /** 파트 하나가 끝날 때마다 그때까지의 리포트(partial)로 부른다 — 화면이 다 쓴 섹션부터 보여 준다 */
  onPart?: (partial: PaidReport) => Promise<void>;
}): Promise<PaidReport> {
  const { db, resolved, answers, nickname } = args;
  const now = args.now ?? new Date();
  const { chart, character } = resolved;
  const { periods, wish, skeleton } = prepareSkeleton({ ...args, now });
  const typeLine = findRow(db, "A5", (r) => r.character === character.name)?.type_line ?? "";
  const flow = skeleton.sections.find((s) => s.no === 5)?.body.filter((b): b is Extract<Block, { t: "step" }> => b.t === "step").map((b) => b.label) ?? [];
  const built = buildReportInput({ nickname, chart, character, answers, periods, wish, typeLine, flow, bridgeBasis27: skeleton.bridgeBasis27, desiredYear: skeleton.desiredYear });
  const c1 = compileC1(db.dbs.C1.rows as unknown as C1Row[]);
  const summaries = Object.fromEntries(skeleton.sections.map((s) => [s.no, s.summary]));
  const bridgeOf = (no: 5 | 6) => skeleton.sections.find((s) => s.no === no)?.body.find((b) => b.t === "bridge")?.text ?? null;
  const ctx = {
    summaries,
    wish: answers.q3,
    judgements: { 5: judgementSentence(skeleton, 5), 6: judgementSentence(skeleton, 6) },
    fallbackBridges: { 5: bridgeOf(5), 6: bridgeOf(6) },
  };

  const runPart = async (part: PartId) => {
    const dbSentences = PARTS[part].sections.flatMap((n) => skeleton.dbSentences[n]);
    built.input.db_sentences = dbSentences;
    const system = fillSystemPrompt(built, dbSentences);
    const user = partUserMessage(built, part, summaries);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const out = processPartOutput(await callModel(system, user), part, built, c1, CHARACTER_NAMES, ctx);
        // 잇기만 규칙에 안 맞으면: 첫 번째는 다시 만들고, 두 번째는 B12 대체 문장을 끼운 채 쓴다(06 v3.1).
        if (out.ok && (out.bridgeFailed.length === 0 || attempt === 1)) return out.sections;
        // 실패 사유는 코드만 남긴다(문장·개인정보는 로그에 남기지 않음).
        console.warn(`리포트 파트 ${part} 검증 실패(${attempt + 1}회):`, out.ok ? `bridge:${out.bridgeFailed.join(",")}` : out.issues.filter((i) => i.severity !== "경고").map((i) => i.code).join(","));
      } catch (e) {
        console.warn(`리포트 파트 ${part} 생성 실패(${attempt + 1}회):`, e instanceof Error ? e.name : "unknown");
      }
    }
    return null; // DB 뼈대로
  };

  const ai: Partial<Record<SectionNo, Block[]>> = {};
  const done = new Set<SectionNo>();
  let anyAi = false;
  const assemble = (partial: boolean): PaidReport => ({
    sections: skeleton.sections
      .filter((s) => !partial || done.has(s.no as SectionNo))
      .map((s) => (ai[s.no as SectionNo]?.length ? { ...s, body: ai[s.no as SectionNo]!, source: "ai" as const } : { ...s, source: "db" as const })),
    questions: skeleton.questions,
    practices: skeleton.practices,
    closing: skeleton.closing,
    model: anyAi ? REPORT_MODEL : "db-only",
    generatedAt: now.toISOString(),
    ...(partial ? { partial: true } : {}),
  });
  // 파트 저장은 한 번에 하나씩(늦게 끝난 저장이 앞선 내용을 덮지 않게)
  let saving: Promise<void> = Promise.resolve();
  await Promise.all(
    (["A", "B", "C"] as PartId[]).map(async (part) => {
      const out = await runPart(part);
      if (out) {
        Object.assign(ai, out);
        anyAi = true;
      }
      for (const n of PARTS[part].sections) done.add(n);
      if (args.onPart && done.size < skeleton.sections.length) {
        const snapshot = assemble(true);
        saving = saving.then(() => args.onPart!(snapshot)).catch(() => {});
      }
    }),
  );
  await saving;
  return assemble(false);
}
