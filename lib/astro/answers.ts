// 질문 3개와 그 매핑(마스터스펙 4장, 5-1, 5-2 / 04_데이터.json). 선택지 글자는 스펙 그대로 — 바꾸지 않는다.
// Q3는 아직 '초안'(8-3 남은 결정)이라 확정되면 여기만 고친다.
import type { Competency, PlanetKey } from "./constants.ts";

export const Q1_OPTIONS = ["직업·커리어", "진로·자기계발", "연애", "가족", "교우·사회관계", "재정·생활안정"] as const;
export const Q2_OPTIONS = ["버텨", "배움", "변화", "멈춤", "성취", "이별", "고생", "그만하자", "시작", "설렘"] as const;
export const Q3_ALL = ["안정", "도약", "회복", "사랑", "좋은 사람들", "여유", "건강한 생활", "경제적 여유", "인정", "나다움", "시작"] as const;
/** Q3 11개 확정(2026-10-10, 마스터스펙 4장): 추가 후보였던 '새로운 시작'을 화면 이름·키 모두 '시작'으로 넣는다.
 *  Q2(2026 한 단어)에도 '시작'이 있어 서버는 늘 q2_word / q3_wish 칸으로 구분한다. */
export const Q3_OPTIONS: readonly Q3Wish[] = Q3_ALL;

/**
 * 화면에 보이는 Q2 글자(owner 2026-10-10: '그만하자' → '그만'). 저장값·해석 DB 키는 그대로 '그만하자'라
 * 예전 결과와 DB 문장 연결이 바뀌지 않는다 — 화면·AI 입력·쏘웰라 요약에서만 이 글자를 쓴다.
 */
export const Q2_LABELS: Readonly<Record<string, string>> = { 그만하자: "그만" };
export function q2Label(word: string): string {
  return Q2_LABELS[word] ?? word;
}

export type Q1Domain = (typeof Q1_OPTIONS)[number];
export type Q2Word = (typeof Q2_OPTIONS)[number];
export type Q3Wish = (typeof Q3_ALL)[number];

export const Q_LABELS = {
  Q1: "요즘 제일 신경 쓰이는 부분은 무엇인가요?",
  Q2: "당신에게 2026년을 한 단어로 정의하면?",
  Q3: "2027년에 희망하는 것은?",
} as const;

export interface Answers {
  q1: Q1Domain;
  q2: Q2Word;
  q3: Q3Wish;
}

/** Q2가 이 단어면 톤을 한 단계 부드럽게 하고 쏘웰라·전문 상담 안내를 함께 보여준다(진행은 막지 않음). */
export const SOFT_TONE_WORDS: ReadonlySet<Q2Word> = new Set(["그만하자", "이별", "고생"]);

export function isSoftTone(q2: Q2Word): boolean {
  return SOFT_TONE_WORDS.has(q2);
}

/** 고민 영역 → 관련 하우스·행성(5-1). MC는 '행성' 자리에 함께 둔다. */
export const DOMAIN_MAP: Record<Q1Domain, { houses: number[]; points: Array<PlanetKey | "mc"> }> = {
  "직업·커리어": { houses: [10, 6], points: ["saturn", "mc"] },
  "진로·자기계발": { houses: [9, 3], points: ["jupiter", "mercury"] },
  연애: { houses: [5, 7], points: ["venus", "mars"] },
  가족: { houses: [4], points: ["moon"] },
  "교우·사회관계": { houses: [11, 3], points: ["mercury", "uranus"] },
  "재정·생활안정": { houses: [2, 8], points: ["venus", "saturn"] },
};

/**
 * Q3 바람 → 바람이 걸린 하우스·주제 행성·연결 역량(마스터스펙 5-2 v3 / 04_데이터.json wish_map).
 * 하우스는 지배 행성·하우스 안 행성·목성/토성 통과로 풀린다(lib/astro/wish.ts).
 */
export type WishNatural = PlanetKey | "asc" | "mc";
export const WISH_MAP: Record<Q3Wish, { houses: number[]; natural: WishNatural[]; competency: Competency }> = {
  안정: { houses: [4, 2], natural: ["moon", "saturn"], competency: "믿기" },
  도약: { houses: [10], natural: ["mc", "sun", "jupiter"], competency: "선 지키기" },
  인정: { houses: [10], natural: ["mc", "sun"], competency: "말하기" },
  사랑: { houses: [5, 7], natural: ["venus"], competency: "기대기" },
  "좋은 사람들": { houses: [11], natural: ["jupiter"], competency: "말하기" },
  "경제적 여유": { houses: [2], natural: ["jupiter", "venus"], competency: "믿기" },
  나다움: { houses: [1], natural: ["asc", "sun"], competency: "선 지키기" },
  회복: { houses: [1, 12], natural: ["moon"], competency: "회복하기" },
  여유: { houses: [12, 5], natural: ["moon", "venus"], competency: "회복하기" },
  // 루틴·습관으로만 해석, 질병·몸 상태 예측 금지
  "건강한 생활": { houses: [1, 6], natural: ["moon"], competency: "선 지키기" },
  시작: { houses: [1, 9], natural: ["asc", "sun", "jupiter"], competency: "선 지키기" },
};

/** 변화를 바라는 바람 — 움직이는 해에 이루어짐 +1(C2 W_047). */
export const CHANGE_WISHES: ReadonlySet<Q3Wish> = new Set(["도약", "나다움", "시작"]);

export function isAnswers(v: unknown): v is Answers {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  return (
    (Q1_OPTIONS as readonly unknown[]).includes(a.q1) &&
    (Q2_OPTIONS as readonly unknown[]).includes(a.q2) &&
    (Q3_OPTIONS as readonly unknown[]).includes(a.q3)
  );
}
