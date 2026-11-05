// AI 검색·답변 도구가 읽기 쉬운 사이트 안내(llms.txt 관례, owner 2026-11-05 'AI 수집이 잘 되게').
// 공개 소개 페이지 목록과 한 줄 설명만 — 개인 결과·결제 주소는 넣지 않는다. 내용은 lib/about/content.ts 한 곳에서.
import { ABOUT_DESCRIPTION, ABOUT_INTRO, ABOUT_URL, FAQS, SITE, SOWELLA_URL, SUB_PAGES, subPageUrl } from "@/lib/about/content";

export const dynamic = "force-static";

export function GET() {
  const lines = [
    "# 쏠 아스트로 하우스",
    "",
    `> ${ABOUT_DESCRIPTION}`,
    "",
    ABOUT_INTRO,
    "",
    "## 소개 페이지",
    `- [쏠 아스트로 하우스 소개](${ABOUT_URL}): 한눈에 보기, 이용 순서, 만든 사람, 자주 묻는 질문 전체`,
    ...SUB_PAGES.map((p) => `- [${p.nav}](${subPageUrl(p.slug)}): ${p.description}`),
    `- [개인정보처리방침·이용약관](${SITE}/legal)`,
    "",
    "## 자주 묻는 질문",
    ...FAQS.flatMap((f) => [`- Q. ${f.q}`, `  A. ${f.a}`]),
    "",
    "## 바로 가기",
    `- [테스트 보러 가기](${SITE}/test)`,
    `- [쏘웰라와 이야기하기](${SOWELLA_URL})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
