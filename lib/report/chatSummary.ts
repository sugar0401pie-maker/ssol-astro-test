// 쏘웰라 채팅이 참고할 점성술 리포트 요약(순수 함수). owner 결정(2026-10-08):
// 유형 문장·2026년 회고·2027년에 바라는 것과 그 판정·앞으로 5년의 흐름, 그리고 결제했으면 리포트 본문과 제안을 넘긴다
// ("사실상 보고서를 넘기는 것"). 2026-10-10 owner 결정(16_쏘웰라연결 handoff)으로 태양·달·상승궁 별자리와 Q1 고민 영역도 넘긴다.
// 출생 날짜·시간·장소·좌표·결제 정보는 넣지 않는다(동의 문구 초안 ①의 '이용하지 않는 항목'). 동물 이름도 넣지 않는다(캐릭터 비노출).
//
// 형식은 쏘웰라가 디저트 심층 리포트에 쓰는 것과 같다 — 한 섹션이 한 줄 "[번호. 제목] 본문"(lib/rag/reportSelect.ts가
// 지금 이야기와 관련 있는 섹션만 골라 넣는다. 기본으로 2번·8번을 넣으므로 핵심인 '바라는 것과 5년 흐름'을 2번에, '질문·제안'을 8번에 둔다).
// 쏘웰라는 이 글을 진단·예측이 아닌 자기 성찰 참고 자료로만 쓴다(그쪽 lib/rag/prompt.ts 지침).
import { isSoftTone, q2Label } from "../astro/answers.ts";
import { josa } from "./format.ts";
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

/**
 * 쏘웰라 첫 인사 고르기(16_쏘웰라연결 §4): SOFT > HEAD > OPEN > NOTIME > QUESTION > DEFAULT.
 * RETURN(다시 들어옴)·LASTDAY(이용권 마지막 날)는 쏘웰라만 아는 상황이라 그쪽이 고른다.
 */
export function greetingIdFor(args: { q2: string; level2027: string | null; accuracy: string; hasQuestions: boolean }): string {
  if (isSoftTone(args.q2 as Answers["q2"])) return "GREET_SOFT";
  if (args.level2027 === "역풍") return "GREET_HEAD";
  if (args.level2027 === "순풍") return "GREET_OPEN";
  if (args.accuracy === "C") return "GREET_NOTIME";
  if (args.hasQuestions) return "GREET_QUESTION";
  return "GREET_DEFAULT";
}

/** B15 첫 인사 문장 채우기 — {닉네임}·{태양별자리}·{질문1}·{바람:조사}·‘{단어}’(이)라고(받침에 맞춰). 못 채우면 null. */
export function fillGreeting(text: string, v: { nickname: string; sunSign: string; wish: string; word: string; question1?: string }): string | null {
  let t = text
    .replaceAll("{닉네임}", v.nickname)
    .replaceAll("{태양별자리}", v.sunSign)
    .replace(/\{바람:(이\/가|을\/를|은\/는)\}/g, (_m, pair: "이/가" | "을/를" | "은/는") => josa(v.wish, pair))
    .replace("‘{단어}’(이)라고", `‘${v.word}’${josa(v.word, "이라/라").slice(v.word.length)}고`);
  if (v.question1) t = t.replaceAll("{질문1}", v.question1);
  return /\{[^}]+\}/.test(t) ? null : t;
}

export function buildChatSummary(args: {
  db: AstroDb;
  free: FreeResult;
  /** 첫 인사에 쓸 닉네임(없으면 첫 인사 문장은 넣지 않고 id만) */
  nickname?: string;
  answers: Answers;
  wish: WishResult;
  paid?: PaidPartsForChat | null;
}): string {
  const { db, free, answers, wish, paid, nickname } = args;
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

  // 대화 시작 정보(16_쏘웰라연결 §2: soft_tone·정확도·greeting_id). 쏘웰라가 첫 메시지로 그대로 보낼 수 있게 채운 문장도 함께.
  const level2027 = wish.years.find((y) => y.year === 2027)?.level ?? null;
  const greetingId = greetingIdFor({ q2: answers.q2, level2027, accuracy: free.accuracy, hasQuestions: !!paid?.questions.items.length });
  const greetRow = findRow(db, "B15", (r) => r.id === greetingId);
  const greeting = greetRow && nickname ? fillGreeting(greetRow.text, { nickname, sunSign: free.sunSign, wish: answers.q3, word: q2Label(answers.q2), question1: paid?.questions.items[0] }) : null;
  const startInfo = `[9. 대화 시작 정보] ${one([`정확도 ${free.accuracy}등급.`, `부드러운 톤: ${isSoftTone(answers.q2) ? "예" : "아니요"}.`, `첫 인사: ${greetingId}.`, greeting ? `첫 인사 문장: ${greeting}` : null])}`;

  // 전체 길이 안전장치(쏘웰라 디저트 리포트와 같은 6000자). 넘으면 리포트 본문(6→5→4번)부터 뺀다 —
  // 유형·바라는 것과 5년·2026 회고·질문과 제안이 채팅에 가장 쓸모 있다.
  for (const no of [6, 5, 4, 3]) {
    if (lines.join("\n").length <= CHAT_SUMMARY_MAX) break;
    const i = lines.findIndex((l) => l.startsWith(`[${no}. `));
    if (i >= 0) lines.splice(i, 1);
  }
  // 대화 시작 정보는 잘리지 않게 맨 끝에 따로 붙인다(본문을 먼저 줄인다)
  const room = CHAT_SUMMARY_MAX - startInfo.length - 1;
  return `${lines.join("\n").slice(0, Math.max(0, room))}\n${startInfo}`;
}
