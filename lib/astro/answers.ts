// 질문 3개와 그 매핑(마스터스펙 4장, 5-1, 5-2 / 04_데이터.json). 선택지 글자는 스펙 그대로 — 바꾸지 않는다.
// Q3는 아직 '초안'(8-3 남은 결정)이라 확정되면 여기만 고친다.
import type { Competency, PlanetKey } from "./constants.ts";

export const Q1_OPTIONS = ["직업·커리어", "진로·자기계발", "연애", "가족", "교우·사회관계", "재정·생활안정"] as const;
export const Q2_OPTIONS = ["버텨", "배움", "변화", "멈춤", "성취", "이별", "고생", "그만하자", "시작", "설렘"] as const;
export const Q3_OPTIONS = ["안정", "도약", "회복", "사랑", "좋은 사람들", "여유", "건강한 생활", "경제적 여유", "인정", "나다움"] as const;

export type Q1Domain = (typeof Q1_OPTIONS)[number];
export type Q2Word = (typeof Q2_OPTIONS)[number];
export type Q3Wish = (typeof Q3_OPTIONS)[number];

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

/** Q3 바람 → 보는 자리(행성·축·하우스)와 연결 역량(5-2). */
export type WishPoint = PlanetKey | "mc" | "asc" | `H${number}`;
export const WISH_MAP: Record<Q3Wish, { points: WishPoint[]; competency: Competency }> = {
  안정: { points: ["saturn", "H4", "H2"], competency: "믿기" },
  도약: { points: ["jupiter", "H10", "mc", "mars"], competency: "선 지키기" },
  회복: { points: ["moon", "H6", "H12"], competency: "회복하기" },
  사랑: { points: ["venus", "H5", "H7"], competency: "기대기" },
  "좋은 사람들": { points: ["H11", "H3", "mercury"], competency: "말하기" },
  여유: { points: ["venus", "H12", "H5"], competency: "회복하기" },
  // 루틴·습관으로만 해석, 질병·몸 상태 예측 금지
  "건강한 생활": { points: ["H6", "H1", "mars"], competency: "선 지키기" },
  "경제적 여유": { points: ["H2", "H8", "venus", "saturn"], competency: "믿기" },
  인정: { points: ["sun", "H10", "mc"], competency: "말하기" },
  나다움: { points: ["sun", "asc", "H1"], competency: "선 지키기" },
};

export function isAnswers(v: unknown): v is Answers {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  return (
    (Q1_OPTIONS as readonly unknown[]).includes(a.q1) &&
    (Q2_OPTIONS as readonly unknown[]).includes(a.q2) &&
    (Q3_OPTIONS as readonly unknown[]).includes(a.q3)
  );
}
