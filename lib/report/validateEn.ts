// 영문 유료 리포트 AI 출력 검증(영문판, 2026-11-04). 한국어 validateReport와 같은 자리에서 쓰는 영문판.
// 규칙 출처: 개발메모 §8(해요체·조사·글자 수 규칙 삭제 → 영문 기준), 15_AI검증/validate_text_en.py + 11_해석DB/C1_EN.json(71개).
// 한국어와 같은 것: 토큰 밖 숫자 금지(하우스 번호는 입력에 있는 것만), 모르는/빠진 토큰, 입력에 없는 행성·별자리, 이론명, **, 표,
// 필수 섹션 제목, 역풍 포장, 경제적 여유의 수입 예측. 영문에만: C1_EN, hedge(may/might/perhaps/maybe) 문단당 2개 이상은 경고.
import type { ValidationIssue } from "./validate.ts";
import { THEORY_NAMES } from "./validate.ts";
import { EN_PLANET_NAMES, EN_SIGN_NAMES } from "./labels.ts";

export interface C1EnRow {
  id: string;
  category: string;
  pattern: string;
  scope: string;
  severity: string;
}
export interface C1EnRule {
  row: C1EnRow;
  re: RegExp;
}

/** 파이썬 정규식 "re:(?i)…"을 JS로(앞의 (?i)만 쓰고 있어 i 플래그로 바꾼다). re:가 아니면 글자 그대로. */
export function compileC1En(rows: C1EnRow[]): C1EnRule[] {
  return rows.map((row) => {
    let p = row.pattern;
    if (!p.startsWith("re:")) return { row, re: new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "m") };
    p = p.slice(3);
    const ci = p.startsWith("(?i)");
    if (ci) p = p.slice(4);
    // 파이썬의 \UXXXXXXXX(이모지 범위)는 JS에서 \u{X} + u 플래그(한국어 compileC1과 같은 변환)
    const uni = /\\U[0-9A-Fa-f]{8}/.test(p);
    if (uni) p = p.replace(/\\U([0-9A-Fa-f]{8})/g, (_m, h: string) => `\\u{${h.replace(/^0+/, "")}}`);
    return { row, re: new RegExp(p, (ci ? "i" : "") + "m" + (uni ? "u" : "")) };
  });
}

const TOKEN_ANY = /\{\{[^{}]*\}\}|\{[^{}]*\}/g;
const TOKEN_RE = /\{\{([^{}]+)\}\}/g;

/** C1_EN 검사(토큰은 지우고 본다 — validate_text_en.py와 같은 방식). AI 범위면 'AI만' 규칙도 */
export function c1EnHits(text: string, rules: C1EnRule[], scope: "DB" | "AI"): ValidationIssue[] {
  const clean = (text ?? "").replace(TOKEN_ANY, " ");
  const out: ValidationIssue[] = [];
  for (const { row, re } of rules) {
    if (row.scope === "AI만" && scope !== "AI") continue;
    // 토큰 밖 숫자(BAN_EN_058)는 validateReportEn이 하우스 번호 예외를 두고 따로 본다(한국어 BAN_075와 같은 방식)
    if (row.id === "BAN_EN_058") continue;
    const m = re.exec(clean);
    if (m) out.push({ code: "c1", detail: `${row.id} ${row.category} '${m[0]}'`, severity: row.severity === "경고" ? "경고" : "실패" });
  }
  return out;
}

export interface ValidateEnOptions {
  allowedTokens: string[];
  requiredTokens?: string[];
  /** 입력에 들어 있는 행성·별자리 영문 이름 */
  allowedNames: string[];
  requiredSections?: string[];
  allowedHouses?: number[];
  headwind2027?: boolean;
  c1Rules?: C1EnRule[];
  /** 2027 바람(영문 이름, 예: "Financial ease") */
  wish?: string;
}

const MONEY_BAN_EN = /\b(income|salary|pay raise|raise in pay|profits?|get rich|earn more|windfall|make money)\b/i;
const SUGARCOAT_EN = ["smooth sailing", "a great year", "everything goes well", "a lucky year", "easy year"];
const HEDGE = /\b(may|might|perhaps|maybe|possibly)\b/gi;

export function validateReportEn(text: string, opts: ValidateEnOptions): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const used = new Set<string>();
  for (const m of text.matchAll(TOKEN_RE)) used.add(m[1].split(":")[0].trim());
  const withoutTokens = text.replace(TOKEN_RE, "");
  const houses = new Set(opts.allowedHouses ?? []);
  const structural = withoutTokens
    .replace(/^###\s*\d+\..*$/gm, "")
    // 영문 프롬프트가 쓰라고 한 소제목(번역 묶음 B11 HEAD_2027_FLOW) — 연도가 들어 있지만 구조라 허용
    .replace(/^\s*•\s*How 2027 unfolds\s*$/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    // 하우스 번호("5th house", "5H", "house 5")는 입력에 있는 것만 허용
    .replace(/\b(\d{1,2})(st|nd|rd|th)\s+house\b|\b(\d{1,2})H\b|\bhouse\s+(\d{1,2})\b/gi, (m, a?: string, _s?: string, b?: string, c?: string) =>
      houses.has(Number(a ?? b ?? c)) ? "" : m,
    );
  const digit = structural.match(/.{0,12}[0-9].{0,12}/);
  if (digit) issues.push({ code: "digit_outside_token", detail: digit[0] });
  for (const t of used) if (!opts.allowedTokens.includes(t)) issues.push({ code: "unknown_token", detail: t });
  for (const t of opts.requiredTokens ?? []) if (!used.has(t)) issues.push({ code: "missing_token", detail: t });
  for (const name of [...EN_PLANET_NAMES, ...EN_SIGN_NAMES]) {
    if (!opts.allowedNames.includes(name) && new RegExp(`\\b${name}\\b`).test(withoutTokens)) issues.push({ code: "unknown_planet_or_sign", detail: name });
  }
  for (const p of THEORY_NAMES) {
    if (!/^[A-Za-z]+$/.test(p) || p.length < 3) continue; // 한국어·짧은 인명은 영문 문장에 해당 없음
    if (new RegExp(`\\b${p}\\b`).test(text)) issues.push({ code: "theory_name", detail: p });
  }
  for (const p of ["Ellis", "Seligman", "Frankl", "Linehan", "Hayes", "Aaron Beck", "Sue Johnson", "Jeffrey Young", "logotherapy", "schema therapy", "cognitive behavioral", "dialectical"]) {
    if (new RegExp(`\\b${p}\\b`, "i").test(text)) issues.push({ code: "theory_name", detail: p });
  }
  if (text.includes("**")) issues.push({ code: "markdown_bold", detail: "**" });
  if (/^\s*\|/m.test(text)) issues.push({ code: "table", detail: "tables are drawn by the server" });
  if (opts.wish === "Financial ease") {
    const m = text.match(MONEY_BAN_EN);
    if (m) issues.push({ code: "money_predict", detail: m[0] });
  }
  for (const s of opts.requiredSections ?? []) if (!text.includes(s)) issues.push({ code: "missing_section", detail: s });
  if (opts.headwind2027) for (const p of SUGARCOAT_EN) if (text.toLowerCase().includes(p)) issues.push({ code: "headwind_sugarcoat", detail: p });
  // hedge: 문단에 두 개 이상이면 경고(실패 아님 — 개발메모 §8 '비율 상한')
  for (const para of text.split(/\n\s*\n/)) {
    const n = (para.match(HEDGE) ?? []).length;
    if (n >= 2) {
      issues.push({ code: "hedge", detail: `${n} hedges`, severity: "경고" });
      break;
    }
  }
  if (opts.c1Rules) issues.push(...c1EnHits(text, opts.c1Rules, "AI"));
  return issues;
}
