// 영문 결과의 '주요 문장' 굵게(owner 2026-11-04: 문단 두 개마다 꼭 한 문장은 굵게).
// 규칙: 문단 순서(0부터)가 짝수인 문단의 첫 문장을 굵게 — 두 문단마다 하나. 문장은 . ! ? 뒤 공백 + 대문자/따옴표에서 끊는다.
// 첫 문장이 너무 짧거나(15자 미만) 길면(240자 초과) 문단 전체가 한 문장일 때만 통째로, 아니면 굵게 하지 않는다.
export function splitKeySentence(text: string): { key: string; rest: string } | null {
  const t = text.trim();
  if (!t) return null;
  const m = t.match(/^(.+?[.!?][’”"')]?)\s+(?=[A-Z“"‘'(])/);
  const first = m ? m[1] : t;
  if (first.length < 15 || first.length > 240) return null;
  return { key: first, rest: t.slice(first.length) };
}

/** 문단 순서로 굵게 할지 — 짝수 번째(0, 2, 4…)만 */
export const isKeyParagraph = (index: number) => index % 2 === 0;
