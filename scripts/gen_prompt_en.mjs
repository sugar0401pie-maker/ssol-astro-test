// 영문 유료 리포트 AI 시스템 프롬프트(영문판, 2026-11-04). 원본: 번역 묶음 영문번역_화면문구·안내 › PROMPT 시트('## Full system prompt' 아래).
// 다시 만들기: node scripts/gen_prompt_en.mjs  (손으로 고치지 않기 — lib/report/aiReport.test.ts류처럼 테스트가 원본과 비교한다)
// 번역본은 한국어 프롬프트 v3.1을 옮긴 것이라 영문판 결정과 어긋나는 몇 줄을 아래 FIXES로만 바꾼다(바꾼 이유를 함께 적음).
import { readFileSync, writeFileSync } from "node:fs";

const SRC = new URL("../docs/spec/20_영문번역/영문번역_화면문구·안내_KO-EN_재번역1104.json", import.meta.url);

export const FIXES = [
  // 영문 판정 이름은 한 단어(용어집 2026-11-04 확정: Open Year · Steady Year · Building Year, 괄호 표기 없음)
  ["using the dual-label name", "using the judgement name exactly as the server gives it"],
  ["write every judgement name with both parts", "write every judgement name exactly as the server gives it"],
  // '150~320자'는 한국어 글자 수 — 영어 예시는 80~120단어라 단어 수로
  ["(exactly 4 sentences, 150–320 characters)", "(exactly 4 sentences, about 50–130 words)"],
  ["4 sentences · 150–320 characters", "4 sentences · about 50–130 words"],
  // 영문 쏘웰라 AI 채팅이 아직 없다 — 맺음말(3일 이용권 안내)은 서버가 붙이거나 숨긴다. AI는 쓰지 않는다.
  [
    '→ the last paragraph opens with "This report comes with a 3-day Sowella AI pass." and invites the user to start a conversation with one of the questions.',
    "→ do not write a closing paragraph about Sowella AI; the server adds the closing.",
  ],
];
const DROP_LINES = [/^10\. Does the closing note mention the "3-day" pass\?$/];

export function build(json) {
  const sheet = json.sheets.PROMPT;
  const rows = (Array.isArray(sheet) ? sheet : sheet.rows).map((r) => ({ n: Number(r.key.split("|")[1]), en: r.en }));
  rows.sort((a, b) => a.n - b.n);
  const start = rows.findIndex((r) => r.en.trim() === "## Full system prompt");
  if (start < 0) throw new Error("'## Full system prompt' 줄을 찾지 못함");
  const out = [];
  let prev = null;
  for (const r of rows.slice(start + 1)) {
    if (DROP_LINES.some((re) => re.test(r.en.trim()))) {
      prev = r.n;
      continue;
    }
    if (prev !== null && r.n - prev > 1 && out.length) out.push("");
    out.push(r.en);
    prev = r.n;
  }
  let text = out.join("\n").trim();
  for (const [a, b] of FIXES) {
    if (!text.includes(a)) throw new Error(`고칠 문장을 찾지 못함: ${a}`);
    text = text.replace(a, b);
  }
  return text;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const body = build(JSON.parse(readFileSync(SRC, "utf8")));
  writeFileSync(
    new URL("../lib/report/systemPromptEn.ts", import.meta.url),
    `// 자동 생성 파일 — 손으로 고치지 말 것. 원본: 번역 묶음 PROMPT 시트 + scripts/gen_prompt_en.mjs FIXES.\n// 다시 만들기: node scripts/gen_prompt_en.mjs\nexport const SYSTEM_PROMPT_TEMPLATE_EN: string = ${JSON.stringify(body)};\n`,
  );
  console.log(`systemPromptEn.ts: ${body.length} chars`);
}
