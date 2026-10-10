// 쏘웰라 채팅이 참고할 점성술 리포트 요약(순수 함수). owner 결정(2026-10-08):
// 유형 문장·2026년 회고·2027년에 바라는 것과 그 판정·앞으로 5년의 흐름, 그리고 결제했으면 리포트 본문과 제안을 넘긴다
// ("사실상 보고서를 넘기는 것"). 2026-10-10 owner 결정(16_쏘웰라연결 handoff)으로 태양·달·상승궁 별자리와 Q1 고민 영역도 넘긴다.
// 출생 날짜·시간·장소·좌표·결제 정보는 넣지 않는다(동의 문구 초안 ①의 '이용하지 않는 항목'). 동물 이름도 넣지 않는다(캐릭터 비노출).
//
// 형식은 쏘웰라가 디저트 심층 리포트에 쓰는 것과 같다 — 한 섹션이 한 줄 "[번호. 제목] 본문"(lib/rag/reportSelect.ts가
// 지금 이야기와 관련 있는 섹션만 골라 넣는다. 기본으로 2번·8번을 넣으므로 핵심인 '바라는 것과 5년 흐름'을 2번에, '질문·제안'을 8번에 둔다).
// 쏘웰라는 이 글을 진단·예측이 아닌 자기 성찰 참고 자료로만 쓴다(그쪽 lib/rag/prompt.ts 지침).
import { q2Label } from "../astro/answers.ts";
import type { Answers } from "../astro/answers.ts";
import { EDGE_LABEL, WISH_LEVEL_DISPLAY, type WishResult } from "../astro/wish.ts";
import { findRow, type AstroDb } from "./db.ts";
import type { FreeResult } from "./freeResult.ts";
import { blockText, type Block } from "./paidSkeleton.ts";

export const CHAT_SUMMARY_MAX = 6000;


export interface PaidPartsForChat {
  sections: Array<{ no: number; title: string; summary: string | null; body: Block[]; tail: Block[] }>;
  questions: { headline: string; items: string[] };
  practices: Array<{ title: string; how: string }>;
}

const one = (parts: Array<string | null | undefined>) => parts.filter((p): p is string => !!p && !!p.trim()).join(" ").replace(/\s*\n+\s*/g, " ").trim();

export function buildChatSummary(args: {
  db: AstroDb;
  free: FreeResult;
  answers: Answers;
  wish: WishResult;
  paid?: PaidPartsForChat | null;
}): string {
  const { db, free, answers, wish, paid } = args;
  const c = free.character;
  const lines: string[] = [];

  // 태양·달·상승궁(상승궁은 태어난 시간을 알 때만 — 시간 모름이면 계산하지 않으므로 빠진다)
  const big3 = free.big3.map((b) => `${b.label.split(" ")[0]} ${b.sign}`).join(", ");
  lines.push(
    `[1. 별이 본 나의 유형] ${one([big3 ? `${big3}.` : null, `${c.typeLine}(${c.competency} × ${c.style}).`, c.why, c.competencyLine, c.styleLine, `요즘 주요 고민: ${answers.q1}.`])}`,
  );

  const levelLine = (y: WishResult["years"][number]) => {
    const short = findRow(db, "A13", (r) => r.wish === answers.q3 && r.level === WISH_LEVEL_DISPLAY[y.level])?.short_line;
    return one([
      `${y.year}년: ${short || WISH_LEVEL_DISPLAY[y.level]}`,
      y.edge ? `(${EDGE_LABEL[y.edge]})` : null,
      y.movementLabel ? `· ${y.movementLabel}` : null,
    ]);
  };
  lines.push(
    `[2. 2027년에 바라는 것과 앞으로 5년의 흐름] ${one([
      `2027년에 바라는 것: ${answers.q3}.`,
      ...wish.years.map((y) => `${levelLine(y)}.`),
      wish.firstOpenYear ? `바라는 것이 처음 활짝 열리는 해: ${wish.firstOpenYear}년.` : wish.closestYear ? `바라는 것에 가장 가까워지는 해: ${wish.closestYear}년.` : null,
    ])}`,
  );

  lines.push(`[3. 2026년 회고] ${one([`2026년을 한 단어로: ${q2Label(answers.q2)}.`, free.year2026.intro, ...free.year2026.turningPoints, free.year2026.closing])}`);

  if (paid) {
    for (const s of paid.sections) {
      if (s.no === 7) continue; // 질문·제안은 8번으로 따로
      const paras = [s.summary ?? "", ...[...s.body, ...s.tail].filter((b) => b.t !== "head" && b.t !== "sub").map(blockText)].filter(Boolean);
      if (paras.length) lines.push(`[${s.no}. ${s.title}] ${one(paras)}`);
    }
    const q = paid.questions.items.length ? `별이 주는 질문: ${paid.questions.headline ? `${paid.questions.headline} ` : ""}${paid.questions.items.join(" / ")}.` : null;
    const p = paid.practices.length ? `작은 실천: ${paid.practices.map((x) => `${x.title} — ${x.how}`).join(" / ")}.` : null;
    if (q || p) lines.push(`[8. 별이 주는 질문과 웰니스 제안] ${one([q, p])}`);
  }

  // 전체 길이 안전장치(쏘웰라 디저트 리포트와 같은 6000자). 넘으면 리포트 본문(6→5→4번)부터 뺀다 —
  // 유형·바라는 것과 5년·2026 회고·질문과 제안이 채팅에 가장 쓸모 있다.
  for (const no of [6, 5, 4, 3]) {
    if (lines.join("\n").length <= CHAT_SUMMARY_MAX) break;
    const i = lines.findIndex((l) => l.startsWith(`[${no}. `));
    if (i >= 0) lines.splice(i, 1);
  }
  return lines.join("\n").slice(0, CHAT_SUMMARY_MAX);
}
