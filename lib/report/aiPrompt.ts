// 유료 리포트 AI 프롬프트 조립·출력 처리(순수 함수 — 모델 호출은 aiReport.ts).
// 원칙(마스터스펙 7-1, 06 프롬프트): AI는 계산하지 않고 숫자·날짜는 토큰으로만 쓴다. 출력은 자동 검증을 통과해야
// 화면에 나가고, 통과하면 서버가 토큰을 실제 값으로 바꾼다. 실패하면 그 파트만 1회 다시 만들고, 그래도 실패하면 DB 뼈대.
import type { BuiltReportInput } from "./reportInput.ts";
import { SYSTEM_PROMPT_TEMPLATE } from "./systemPrompt.ts";
import { substituteTokens, validateReport, type C1Rule, type ValidationIssue } from "./validate.ts";

export type PartId = "A" | "B" | "C";

/** 병렬 3파트: 연말 / 2027 / 5년+질문 (06 프롬프트: 섹션 4·5·(6+7)) */
export const PARTS: Record<PartId, { sections: Array<4 | 5 | 6 | 7>; headers: string[] }> = {
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
    first_open_year: i.first_open_year ?? (i.closest_year ? `없음(가장 가까워지는 해: ${i.closest_year})` : "없음"),
    wish_reason: JSON.stringify(i.wish_reason),
    db_sentences: dbSentences.map((s) => `- ${s}`).join("\n") || "(없음)",
    tokens,
  };
  // 아는 자리표시자만 바꾼다 — {{E1_기간}} 같은 토큰 예시는 그대로 둔다.
  return SYSTEM_PROMPT_TEMPLATE.replace(/(?<!\{)\{([a-z_0-9]+)\}(?!\})/g, (m, k: string) => values[k] ?? m);
}

export function partUserMessage(built: BuiltReportInput, part: PartId): string {
  const p = PARTS[part];
  const extra =
    part === "C"
      ? "\n7번 섹션의 '• 별이 주는 질문 3가지'와 '• 작은 실천 3가지' 목록은 서버가 DB 문장 그대로 화면에 붙입니다. 목록은 쓰지 말고 두괄식 문장, 왜 이 질문인지 문단, 마지막 쏘웰라 안내 문단만 쓰세요."
      : "";
  return [
    `이번에는 다음 섹션만 쓰세요(제목 줄 그대로): ${p.headers.join(" / ")}`,
    "표와 타임라인, 접힌 근거는 서버가 그리므로 쓰지 않습니다." + extra,
    "",
    "입력(JSON):",
    JSON.stringify(built.input),
  ].join("\n");
}

export interface PartOutcome {
  ok: boolean;
  /** 섹션 번호 → 문단(토큰을 실제 값으로 바꾼 뒤) */
  sections: Partial<Record<4 | 5 | 6 | 7, string[]>>;
  issues: ValidationIssue[];
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

export function processPartOutput(
  text: string,
  part: PartId,
  built: BuiltReportInput,
  c1Rules: C1Rule[],
): PartOutcome {
  const requiredTokens = part === "C" && built.input.first_open_year ? ["열리는해"] : [];
  const issues = validateReport(text, {
    allowedTokens: Object.keys(built.tokens),
    requiredTokens,
    allowedNames: built.allowedNames,
    allowedHouses: built.allowedHouses,
    requiredSections: PARTS[part].headers,
    headwind2027: part === "B" && built.headwind2027,
    c1Rules,
  });
  const failures = issues.filter((i) => i.severity !== "경고");
  if (failures.length) return { ok: false, sections: {}, issues };
  const values = Object.fromEntries(Object.entries(built.tokens).map(([k, v]) => [k, v.value]));
  const split = splitSections(substituteTokens(text, values));
  const sections: PartOutcome["sections"] = {};
  for (const no of PARTS[part].sections) {
    const paras = split[no];
    if (!paras?.length) return { ok: false, sections: {}, issues: [...issues, { code: "missing_section", detail: String(no) }] };
    sections[no] = paras;
  }
  return { ok: true, sections, issues };
}
