// 쏘웰라 채팅이 참고할 점성술 리포트 요약(순수 함수). owner 결정(2026-10-08):
// 유형 문장·2026년 회고·2027년에 바라는 것과 그 판정·앞으로 5년의 흐름, 그리고 결제했으면 리포트 본문과 제안을 넘긴다
// ("사실상 보고서를 넘기는 것"). 별자리(태양·달·상승궁)와 출생 날짜·시간·장소는 넣지 않는다. 동물 이름도 넣지 않는다.
//
// 형식은 쏘웰라가 디저트 심층 리포트에 쓰는 것과 같다 — 한 섹션이 한 줄 "[번호. 제목] 본문"(lib/rag/reportSelect.ts가
// 지금 이야기와 관련 있는 섹션만 골라 넣는다. 기본으로 2번·8번을 넣으므로 핵심인 '바라는 것과 5년 흐름'을 2번에, '질문·제안'을 8번에 둔다).
// 쏘웰라는 이 글을 진단·예측이 아닌 자기 성찰 참고 자료로만 쓴다(그쪽 lib/rag/prompt.ts 지침).
import type { Answers } from "../astro/answers.ts";
import { EDGE_LABEL, WISH_LEVEL_DISPLAY, type WishResult } from "../astro/wish.ts";
import { findRow, type AstroDb } from "./db.ts";
import type { FreeResult } from "./freeResult.ts";

export const CHAT_SUMMARY_MAX = 6000;

const SIGN_NAMES = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];

/**
 * 별자리 이름을 가린다(owner: 별자리는 넘기지 않음). 회고·리포트 문장에 "상승궁 별자리인 쌍둥이자리"처럼
 * 사용자의 별자리가 섞여 있어서, 채팅용 요약에서만 "한 별자리"로 바꾼다(화면의 DB 문장은 그대로).
 */
export function redactSigns(text: string): string {
  return SIGN_NAMES.reduce((t, s) => t.split(s).join("한 별자리"), text);
}

export interface PaidPartsForChat {
  sections: Array<{ no: number; title: string; paragraphs: string[] }>;
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

  lines.push(`[1. 별이 본 나의 유형] ${one([`${c.typeLine}(${c.competency} × ${c.style}).`, c.why, c.competencyLine, c.styleLine])}`);

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

  lines.push(`[3. 2026년 회고] ${one([`2026년을 한 단어로: ${answers.q2}.`, free.year2026.intro, ...free.year2026.turningPoints, free.year2026.closing])}`);

  if (paid) {
    for (const s of paid.sections) {
      if (s.no === 7) continue; // 질문·제안은 8번으로 따로
      if (s.paragraphs.length) lines.push(`[${s.no}. ${s.title}] ${one(s.paragraphs)}`);
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
  return redactSigns(lines.join("\n")).slice(0, CHAT_SUMMARY_MAX);
}
