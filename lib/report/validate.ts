// AI 출력 자동 검증(마스터스펙 7-1 ④, 7-3, 06 프롬프트 '마지막 점검'). 실패하면 그 파트만 1회 재생성,
// 그래도 실패하면 DB 문장만으로 보여준다(호출하는 쪽 책임). 정규식 기반의 최선 검사라 완전하지 않다 —
// 실제 생성 로그에서 놓친 표현이 보이면 목록을 늘린다(쏘웰라 outputCheck.ts와 같은 원칙).
import { SIGNS } from "../astro/constants.ts";

export interface ValidationIssue {
  code:
    | "digit_outside_token"
    | "unknown_token"
    | "missing_token"
    | "unknown_planet_or_sign"
    | "banned_phrase"
    | "theory_name"
    | "markdown_bold"
    | "missing_section"
    | "headwind_sugarcoat"
    | "ending_run"
    | "ending_ratio";
  detail: string;
}

const TOKEN_RE = /\{\{([^{}]+)\}\}/g;

export const PLANET_NAMES_KO = ["태양", "달", "수성", "금성", "화성", "목성", "토성", "천왕성", "해왕성", "명왕성"] as const;

/** 단정·공포·금지 영역 표현(7-3). '투자' 같은 단어 하나보다 문맥이 드러나는 구로 잡아 일상어 오탐을 줄였다. */
export const BANNED_PHRASES = [
  "반드시", "확실히", "틀림없이", "하게 됩니다", "될 것입니다", "크게 잃", "불운", "액운", "부적", "액땜",
  "사고가 나", "사고를 당", "사고가 생", "죽음", "사망", "목숨",
  "질병", "병에 걸", "암에 걸", "수술", "진단", "우울증", "공황장애", "불안장애", "ADHD",
  "주식", "코인", "매수", "매도", "투자 시점", "투자하기 좋은", "부동산을 사",
  "이혼하", "헤어지세요", "헤어지는 게 좋", "결혼하세요", "만나세요",
];

/** 이론명·학자 이름(화면 어디에도 노출 금지, 7-3). */
export const THEORY_NAMES = [
  "ACT", "REBT", "CBT", "DBT", "EFT", "IPT", "수용전념", "수용 전념", "인지행동", "인지 행동", "변증법적",
  "정서중심", "정서 중심", "대인관계치료", "대인관계 치료", "스키마치료", "스키마 치료", "인생함정", "긍정심리",
  "로고테라피", "의미치료", "엘리스", "벡", "셀리그만", "프랭클", "존슨", "리네한", "헤이즈", "영",
];
const CONTEXT_ONLY_NAMES = new Set(["벡", "존슨", "영", "엘리스"]);

/** 역풍인데 좋게 포장하는 표현(7-3 '솔직함과 희망'). */
export const SUGARCOAT_PHRASES = ["순조로운", "순조롭", "좋은 해", "술술", "잘 풀리는 해", "다 잘될"];

export interface ValidateOptions {
  /** 이 출력에서 허용되는 토큰 이름(중괄호 제외) */
  allowedTokens: string[];
  /** 반드시 들어가야 하는 토큰 */
  requiredTokens?: string[];
  /** 입력에 들어 있는(=언급해도 되는) 행성·별자리 이름 */
  allowedNames: string[];
  /** "### 4. 연말까지 조심하면 좋을 것" 같은 필수 헤더 */
  requiredSections?: string[];
  /**
   * 입력에 들어 있는 하우스 번호. 스펙 예시 문장("목성이 내 4하우스를 지나")처럼 하우스 번호는
   * 토큰 없이 써도 되되, 입력에 없는 하우스는 실패로 본다.
   */
  allowedHouses?: number[];
  /** 2027 판정이 역풍이면 true */
  headwind2027?: boolean;
}

// 숫자가 아닌데 숫자 자리에 쓰이는 '한 달·두 달' 등에서 '달'(moon)을 오탐하지 않게 앞말을 본다.
const MOON_FALSE_PREFIX = /(한|두|세|네|몇|이번|다음|지난|매|석|넉|열|반)\s?$/;

function mentions(text: string, name: string): boolean {
  if (name !== "달") return text.includes(name);
  // '달이/달은/달의/달과/달을/달에/달,' 처럼 행성으로 쓰인 경우만 본다. '달라요', '달리' 등은 제외.
  const re = /달(?=(이|은|의|과|을|에|과|,|\s|이라|처럼))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const before = text.slice(Math.max(0, m.index - 4), m.index);
    if (!MOON_FALSE_PREFIX.test(before)) return true;
  }
  return false;
}

export type EndingClass = "formal" | "polite" | "other";

/** 문장 끝 어미 분류: ~습니다/~입니다/~ㅂ니다 계열 vs ~요 계열. */
export function endingClass(sentence: string): EndingClass {
  const s = sentence.replace(/[\s"'”’)\]]+$/, "").replace(/[.!?。…]+$/, "");
  if (/니다$|니까$/.test(s)) return "formal";
  if (/요$/.test(s)) return "polite";
  return "other";
}

export function splitSentences(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => !/^\s*(#|•|-|\d+\.)/.test(line)) // 헤더·말머리 줄은 어미 규칙에서 제외
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateReport(text: string, opts: ValidateOptions): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const used = new Set<string>();
  for (const m of text.matchAll(TOKEN_RE)) used.add(m[1].trim());

  const withoutTokens = text.replace(TOKEN_RE, "");
  // 헤더 번호("### 4.")와 말머리 번호 목록("1. ")은 구조라 허용한다.
  const allowedHouses = new Set(opts.allowedHouses ?? []);
  const structural = withoutTokens
    .replace(/^###\s*\d+\./gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .replace(/(\d{1,2})\s?(하우스|H)/g, (m, n: string) => (allowedHouses.has(Number(n)) ? "" : m));
  const digit = structural.match(/.{0,10}[0-9０-９].{0,10}/);
  if (digit) issues.push({ code: "digit_outside_token", detail: digit[0] });
  for (const t of used) if (!opts.allowedTokens.includes(t)) issues.push({ code: "unknown_token", detail: t });
  for (const t of opts.requiredTokens ?? []) if (!used.has(t)) issues.push({ code: "missing_token", detail: t });

  for (const name of [...PLANET_NAMES_KO, ...SIGNS]) {
    if (!opts.allowedNames.includes(name) && mentions(withoutTokens, name)) {
      issues.push({ code: "unknown_planet_or_sign", detail: name });
    }
  }
  for (const p of BANNED_PHRASES) if (text.includes(p)) issues.push({ code: "banned_phrase", detail: p });
  for (const p of THEORY_NAMES) {
    let hit: boolean;
    if (/^[A-Z]+$/.test(p)) hit = new RegExp(`(^|[^A-Za-z])${p}([^A-Za-z]|$)`).test(text);
    // 짧은 인명은 일상어에 섞여 오탐이 커서 '박사·교수·~의 이론' 같은 인명 문맥일 때만 본다.
    else if (CONTEXT_ONLY_NAMES.has(p)) hit = new RegExp(`${p}\\s?(박사|교수|의 이론)`).test(text);
    else hit = text.includes(p);
    if (hit) issues.push({ code: "theory_name", detail: p });
  }
  if (text.includes("**")) issues.push({ code: "markdown_bold", detail: "**" });
  for (const s of opts.requiredSections ?? []) if (!text.includes(s)) issues.push({ code: "missing_section", detail: s });
  if (opts.headwind2027) {
    for (const p of SUGARCOAT_PHRASES) if (text.includes(p)) issues.push({ code: "headwind_sugarcoat", detail: p });
  }

  // 어미: 같은 계열 3문장 연속 금지, 한쪽 65% 이하(06 프롬프트 '말투').
  const classes = splitSentences(withoutTokens).map(endingClass).filter((c) => c !== "other");
  let run = 1;
  for (let i = 1; i < classes.length; i++) {
    run = classes[i] === classes[i - 1] ? run + 1 : 1;
    if (run >= 3) {
      issues.push({ code: "ending_run", detail: `${classes[i]} ${run}연속(문장 ${i + 1})` });
      break;
    }
  }
  if (classes.length >= 6) {
    const formal = classes.filter((c) => c === "formal").length / classes.length;
    if (formal > 0.65 || formal < 0.35) issues.push({ code: "ending_ratio", detail: `입니다체 ${Math.round(formal * 100)}%` });
  }
  return issues;
}

/** 출력의 토큰을 실제 값으로 바꾼다(검증 통과 후에만 호출). 모르는 토큰이 남아 있으면 예외. */
export function substituteTokens(text: string, values: Record<string, string>): string {
  return text.replace(TOKEN_RE, (_, name: string) => {
    const v = values[name.trim()];
    if (v === undefined) throw new Error(`알 수 없는 토큰: ${name}`);
    return v;
  });
}
