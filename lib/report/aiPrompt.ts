// 유료 리포트 AI 프롬프트 조립·출력 처리(순수 함수 — 모델 호출은 aiReport.ts).
// 원칙(마스터스펙 7-1, 06 프롬프트): AI는 계산하지 않고 숫자·날짜는 토큰으로만 쓴다. 출력은 자동 검증을 통과해야
// 화면에 나가고, 통과하면 서버가 토큰을 실제 값으로 바꾼다. 실패하면 그 파트만 1회 다시 만들고, 그래도 실패하면 DB 뼈대.
// 섹션 5·6의 '바람과 흐름 잇기'(<잇기>…</잇기>, 06 v3.1)는 따로 꺼내 검증하고, 끝내 맞지 않으면 B12 대체 문장으로 바꾼다.
import type { BuiltReportInput } from "./reportInput.ts";
import type { Block } from "./paidSkeleton.ts";
import { SYSTEM_PROMPT_TEMPLATE } from "./systemPrompt.ts";
import { substituteTokens, validateReport, type C1Rule, type ValidationIssue } from "./validate.ts";

export type PartId = "A" | "B" | "C";
export type SectionNo = 4 | 5 | 6 | 7;

/** 병렬 3파트: 연말 / 2027 / 5년+질문 (06 프롬프트: 섹션 4·5·(6+7)) */
export const PARTS: Record<PartId, { sections: SectionNo[]; headers: string[] }> = {
  A: { sections: [4], headers: ["### 4. 연말까지 조심하면 좋을 것"] },
  B: { sections: [5], headers: ["### 5. 2027년을 맞는 마음가짐"] },
  C: { sections: [6, 7], headers: ["### 6. 앞으로 5년의 흐름", "### 7. 별이 주는 질문과 웰니스 제안"] },
};

export function fillSystemPrompt(built: BuiltReportInput, dbSentences: string[]): string {
  const i = built.input;
  const tokens = Object.entries(built.tokens)
    .map(([name, info]) => `{{${name}}} = ${info.meaning}`)
    .join("\n");
  const values: Record<string, string> = {
    nickname: i.user.nickname,
    character: i.character.name,
    competency: i.character.competency,
    style: i.character.style,
    q1_domain: i.answers.q1_domain,
    q3_wish_2027: i.answers.q3_wish_2027,
    soft_tone: String(i.soft_tone),
    wish_support: JSON.stringify(i.wish_support),
    wish_edge: JSON.stringify(i.wish_edge),
    movement: JSON.stringify(i.movement),
    temperament: i.temperament,
    first_open_year: i.first_open_year ?? (i.closest_year ? `없음(가장 가까워지는 해: ${i.closest_year})` : "없음"),
    wish_reason: JSON.stringify(i.wish_reason),
    db_sentences: dbSentences.map((s) => `- ${s}`).join("\n") || "(없음)",
    tokens,
  };
  // 아는 자리표시자만 바꾼다 — {{E1_기간}} 같은 토큰 예시는 그대로 둔다.
  return SYSTEM_PROMPT_TEMPLATE.replace(/(?<!\{)\{([a-z_0-9]+)\}(?!\})/g, (m, k: string) => values[k] ?? m);
}

/** 섹션별 굵은 요약(서버 B11) — AI에는 토큰으로 바꾼 모양을 준다(요약에 연도 숫자가 들어가므로) */
export type Summaries = Partial<Record<SectionNo, string | null>>;

export function partUserMessage(built: BuiltReportInput, part: PartId, summaries: Summaries = {}): string {
  const p = PARTS[part];
  const lines = [`이번에는 다음 섹션만 쓰세요(제목 줄 그대로): ${p.headers.join(" / ")}`, "표와 타임라인, 접힌 근거는 서버가 그리므로 쓰지 않습니다."];
  for (const no of p.sections) {
    const s = summaries[no];
    if (s) lines.push(`${no}번 섹션의 두괄식 첫 문장은 서버가 굵게 붙입니다: "${tokenizeYears(s, built)}" — 이 문장을 첫 문단으로 그대로 쓰고, 다음 문단부터 이어 쓰세요.`);
  }
  if (part === "A") lines.push("4번 섹션의 '• 달마다 살펴볼 것'(월별 줄글)은 서버가 DB 문장으로 붙입니다. '• 연말에 기대해도 좋은 일' 문단까지만 쓰세요.");
  if (part === "C")
    lines.push("7번 섹션의 '• 별이 주는 질문 3가지'와 '• 작은 실천 3가지' 목록은 서버가 DB 문장 그대로 화면에 붙입니다. 목록은 쓰지 말고 두괄식 문장, 왜 이 질문인지 문단, 마지막 쏘웰라 안내 문단만 쓰세요.");
  return [...lines, "", "입력(JSON):", JSON.stringify(built.input)].join("\n");
}

/** 요약 문장의 연도(예: 2028년)를 같은 값의 토큰으로 바꿔 AI가 숫자를 쓰지 않게 한다. */
function tokenizeYears(text: string, built: BuiltReportInput): string {
  return text.replace(/\d{4}년/g, (y) => {
    // '열리는해'처럼 뜻이 있는 토큰을 연도 토큰(Y2028)보다 먼저 쓴다
    const name = Object.entries(built.tokens)
      .filter(([, v]) => v.value === y)
      .sort((a, b) => Number(a[0].startsWith("Y")) - Number(b[0].startsWith("Y")))[0]?.[0];
    return name ? `{{${name}}}` : y;
  });
}

export interface PartOutcome {
  ok: boolean;
  /** 섹션 번호 → 본문 조각(토큰을 실제 값으로 바꾼 뒤) */
  sections: Partial<Record<SectionNo, Block[]>>;
  issues: ValidationIssue[];
  /** 잇기가 규칙(4문장·150~320자·바람 단어·토큰·겹침)에 맞지 않았던 섹션 */
  bridgeFailed: Array<5 | 6>;
}

/** "### n. 제목" 단위로 나누고, 빈 줄로 문단을 나눈다. */
export function splitSections(text: string): Partial<Record<number, string[]>> {
  const out: Partial<Record<number, string[]>> = {};
  const re = /^###\s*(\d)\.[^\n]*$/gm;
  const marks: Array<{ no: number; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) marks.push({ no: Number(m[1]), start: m.index, end: re.lastIndex });
  marks.forEach((mk, i) => {
    const body = text.slice(mk.end, i + 1 < marks.length ? marks[i + 1].start : text.length);
    out[mk.no] = body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  });
  return out;
}

const BRIDGE_RE = /<잇기>([\s\S]*?)<\/잇기>/;

function bigrams(s: string): Set<string> {
  const x = s.replace(/\s+/g, "");
  const out = new Set<string>();
  for (let i = 0; i < x.length - 1; i++) out.add(x.slice(i, i + 2));
  return out;
}
/** a의 글자쌍 중 b에도 있는 비율 */
export function overlapRatio(a: string, b: string): number {
  const A = bigrams(a);
  if (!A.size) return 0;
  const B = bigrams(b);
  let n = 0;
  for (const g of A) if (B.has(g)) n++;
  return n / A.size;
}

/**
 * 바람과 흐름 잇기 검증(06 v3.1 '검증(서버)'): 정확히 4문장 · 150~320자 · 바람 단어 포함 · 날짜 토큰 1개 이상 ·
 * DB 판정 문장과 60% 미만 겹침. 토큰 밖 숫자·C1 금지어·입력 밖 토큰은 파트 전체 검증이 이미 본다.
 */
export function checkBridge(raw: string, opts: { wish: string; judgement: string; values: Record<string, string> }): string[] {
  const problems: string[] = [];
  if (!/\{\{[^{}]+\}\}/.test(raw)) problems.push("no_token");
  let text: string;
  try {
    text = substituteTokens(raw, opts.values).trim();
  } catch {
    return [...problems, "unknown_token"];
  }
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  if (sentences.length !== 4) problems.push(`sentences_${sentences.length}`);
  if (text.length < 150 || text.length > 320) problems.push(`length_${text.length}`);
  if (!text.includes(opts.wish)) problems.push("no_wish");
  if (text.trimEnd().endsWith("?")) problems.push("question_end"); // 06 v3.1: 질문으로 끝내지 않는다
  if (opts.judgement && overlapRatio(text, opts.judgement) >= 0.6) problems.push("overlap");
  return problems;
}

/** AI 문단 → 본문 조각. 짧은 '• ' 한 줄은 소제목, 긴 '• ' 문단은 말머리가 붙은 문단으로 둔다. */
export function paragraphsToBlocks(paras: string[]): Block[] {
  const out: Block[] = [];
  for (const p of paras) {
    const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines[0]?.startsWith("•") && lines[0].length <= 40 && lines.length > 1) {
      out.push({ t: "head", text: lines[0] }, { t: "p", text: lines.slice(1).join(" ") });
    } else if (lines.length === 1 && lines[0].startsWith("•") && lines[0].length <= 40) {
      out.push({ t: "head", text: lines[0] });
    } else {
      out.push({ t: "p", text: lines.join("\n") });
    }
  }
  return out;
}

export interface PartContext {
  /** 서버 굵은 요약 — AI가 첫 문단으로 그대로 쓴 것은 빼고 서버 요약을 쓴다 */
  summaries?: Summaries;
  wish?: string;
  /** 섹션 5·6 DB 판정 문장(겹침 검사) */
  judgements?: Partial<Record<5 | 6, string>>;
  /** 섹션 5·6 B12 대체 문장(토큰 채운 것) */
  fallbackBridges?: Partial<Record<5 | 6, string | null>>;
}

export function processPartOutput(
  text: string,
  part: PartId,
  built: BuiltReportInput,
  c1Rules: C1Rule[],
  /** 화면에 쓰지 않는 말(당분간 캐릭터 동물 이름, show_character=false) — 나오면 실패 */
  bannedWords: readonly string[] = [],
  ctx: PartContext = {},
): PartOutcome {
  const requiredTokens = part === "C" && built.input.first_open_year ? ["열리는해"] : [];
  const plain = text.replace(/<\/?잇기>/g, "");
  const issues = validateReport(plain, {
    allowedTokens: Object.keys(built.tokens),
    requiredTokens,
    allowedNames: built.allowedNames,
    allowedHouses: built.allowedHouses,
    requiredSections: PARTS[part].headers,
    headwind2027: part === "B" && built.headwind2027,
    c1Rules,
    wish: built.input.answers.q3_wish_2027,
  });
  for (const w of bannedWords) if (text.includes(w)) issues.push({ code: "character_name", detail: w });
  const failures = issues.filter((i) => i.severity !== "경고");
  if (failures.length) return { ok: false, sections: {}, issues, bridgeFailed: [] };

  const values = Object.fromEntries(Object.entries(built.tokens).map(([k, v]) => [k, v.value]));
  const rawSplit = splitSections(text);
  const sections: PartOutcome["sections"] = {};
  const bridgeFailed: Array<5 | 6> = [];
  for (const no of PARTS[part].sections) {
    const raws = rawSplit[no];
    if (!raws?.length) return { ok: false, sections: {}, issues: [...issues, { code: "missing_section", detail: String(no) }], bridgeFailed: [] };
    const blocks: Block[] = [];
    let bridgeSeen = false;
    raws.forEach((raw, idx) => {
      const sub = (s: string) => substituteTokens(s, values).trim();
      const m = raw.match(BRIDGE_RE);
      if (m && (no === 5 || no === 6)) {
        bridgeSeen = true;
        const before = raw.slice(0, m.index).trim();
        const after = raw.slice((m.index ?? 0) + m[0].length).trim();
        if (before) blocks.push(...paragraphsToBlocks([sub(before)]));
        const problems = checkBridge(m[1], { wish: ctx.wish ?? built.input.answers.q3_wish_2027, judgement: ctx.judgements?.[no] ?? "", values });
        if (problems.length) {
          bridgeFailed.push(no);
          const fb = ctx.fallbackBridges?.[no];
          if (fb) blocks.push({ t: "bridge", text: fb });
        } else blocks.push({ t: "bridge", text: sub(m[1]) });
        if (after) blocks.push(...paragraphsToBlocks([sub(after)]));
        return;
      }
      const p = sub(raw.replace(/<\/?잇기>/g, ""));
      // 첫 문단이 서버 요약과 같은 문장이면 뺀다(요약은 서버가 굵게 따로 붙임)
      const summary = ctx.summaries?.[no];
      if (idx === 0 && summary && overlapRatio(p, summary) >= 0.5) return;
      blocks.push(...paragraphsToBlocks([p]));
    });
    if ((no === 5 || no === 6) && !bridgeSeen && ctx.fallbackBridges) {
      // 잇기를 빠뜨림 → 실패로 세고, 판정 문단(이중 표기 이름이 들어간 첫 문단) 뒤에 대체 문장을 넣는다
      bridgeFailed.push(no);
      const fb = ctx.fallbackBridges[no];
      if (fb) {
        const at = blocks.findIndex((b) => b.t === "p" && /\((순풍|보통|역풍)\)/.test(b.text));
        blocks.splice(at >= 0 ? at + 1 : Math.min(1, blocks.length), 0, { t: "bridge", text: fb });
      }
    }
    sections[no] = blocks;
  }
  return { ok: true, sections, issues, bridgeFailed };
}
