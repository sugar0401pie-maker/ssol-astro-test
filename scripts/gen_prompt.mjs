// docs/spec/06_리포트프롬프트_점성술.md의 '시스템 프롬프트 전문'을 lib/report/systemPrompt.ts로 옮긴다.
// 프롬프트는 스펙 문서가 원본 — 문서가 바뀌면 `node scripts/gen_prompt.mjs`로 다시 만든다(손으로 고치지 않기).
// lib/report/aiReport.test.ts가 두 내용이 같은지 검사한다.
import { readFileSync, writeFileSync } from "node:fs";

const md = readFileSync(new URL("../docs/spec/06_리포트프롬프트_점성술.md", import.meta.url), "utf8");
export function extract(text) {
  const i = text.indexOf("## 시스템 프롬프트 전문");
  if (i < 0) throw new Error("'## 시스템 프롬프트 전문' 제목을 찾지 못함");
  return text.slice(text.indexOf("\n", i) + 1).trim();
}
const body = extract(md);
writeFileSync(
  new URL("../lib/report/systemPrompt.ts", import.meta.url),
  `// 자동 생성 파일 — 손으로 고치지 말 것. 원본: docs/spec/06_리포트프롬프트_점성술.md '시스템 프롬프트 전문'.\n// 다시 만들기: node scripts/gen_prompt.mjs\nexport const SYSTEM_PROMPT_TEMPLATE: string = ${JSON.stringify(body)};\n`,
);
console.log(`systemPrompt.ts: ${body.length} chars`);
