// 영문 질문 3개(영문판 2026-11-04). 저장값은 한국어 키 그대로(해석 DB가 한국어 키로 찾는다), 화면 글자만 영어.
// 영어 글자는 번역 묶음 DATA04 questions(영문번역_화면문구·안내) 그대로. Q2는 번역된 열 단어 — 한국어판에 나중에 더한
// '정리'·'감사'는 영문 해석 문장이 아직 없어 영문판에서는 보이지 않는다(번역이 오면 더한다).
import { isAnswers, type Answers, type Q1Domain, type Q2Word, type Q3Wish } from "../astro/answers.ts";

export const EN_QUESTIONS_BIG = (nick: string) => `${nick}, just 3 more questions about you.`;

export const EN_Q1: ReadonlyArray<[Q1Domain, string]> = [
  ["직업·커리어", "Work & career"],
  ["진로·자기계발", "Direction & growth"],
  ["연애", "Love"],
  ["가족", "Family"],
  ["교우·사회관계", "Friends & social life"],
  ["재정·생활안정", "Money & stability"],
];
export const EN_Q2: ReadonlyArray<[Q2Word, string]> = [
  ["버텨", "Endurance"],
  ["배움", "Learning"],
  ["변화", "Change"],
  ["멈춤", "Pause"],
  ["성취", "Achievement"],
  ["이별", "Farewell"],
  ["고생", "Hardship"],
  ["그만하자", "Letting go"],
  ["시작", "Beginning"],
  ["설렘", "Butterflies"],
];
export const EN_Q3: ReadonlyArray<[Q3Wish, string]> = [
  ["안정", "Stability"],
  ["도약", "Leap"],
  ["회복", "Recovery"],
  ["사랑", "Love"],
  ["좋은 사람들", "My people"],
  ["여유", "Breathing room"],
  ["건강한 생활", "Healthy routines"],
  ["경제적 여유", "Financial ease"],
  ["인정", "Recognition"],
  ["나다움", "Being myself"],
  ["시작", "A new start"],
];

export const EN_QUESTION_LIST = [
  // Q1 라벨: DATA04 그대로(2026-11-05 신비 톤 수정분 v2.2 — "Main concern" → "What's on your mind")
  { key: "q1", tag: "Q1", label: "What's on your mind", options: EN_Q1 },
  { key: "q2", tag: "Q2", label: "If you had to sum up your 2026 in one word, what would it be?", options: EN_Q2 },
  { key: "q3", tag: "Q3", label: "What do you hope for in 2027?", options: EN_Q3 },
] as const;

export const EN_QUESTIONS_ERR = "Please answer all three questions."; // Claude 초안

export function completeAnswers(a: Partial<Answers>): a is Answers {
  return isAnswers(a);
}
