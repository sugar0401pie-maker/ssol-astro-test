// 서버 포맷 함수 — 날짜 구간·연도·조사를 글자로 바꾸는 유일한 곳(마스터스펙 7-1 ②).
// 화면과 리포트 본문이 같은 함수를 쓰므로 둘의 날짜가 어긋날 수 없다.

const parse = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return { y, m, d: day };
};

/** "2026년 11월 3일" / 연도 생략 시 "11월 3일" */
export function formatDate(date: string, withYear = false): string {
  const { y, m, d } = parse(date);
  return `${withYear ? `${y}년 ` : ""}${m}월 ${d}일`;
}

/**
 * 날짜 구간. 같은 달: "11월 3일~24일", 같은 해: "11월 3일~12월 5일",
 * 해가 바뀌면 월 단위로: "2026년 12월~2027년 2월"(마스터스펙 7-1 예시). 하루짜리는 "4월 26일".
 * withYear: 같은 해 구간에도 연도를 붙인다(5년 파트처럼 연도가 섞이는 곳).
 */
export function formatRange(from: string, to: string, withYear = false): string {
  const a = parse(from);
  const b = parse(to);
  if (from === to) return formatDate(from, withYear);
  if (a.y !== b.y) return `${a.y}년 ${a.m}월~${b.y}년 ${b.m}월`;
  const yp = withYear ? `${a.y}년 ` : "";
  if (a.m === b.m) return `${yp}${a.m}월 ${a.d}일~${b.d}일`;
  return `${yp}${a.m}월 ${a.d}일~${b.m}월 ${b.d}일`;
}

/** 여러 구간(역행 재통과): "5월 5일~6월 19일, 9월 3일~10월 27일" */
export function formatRanges(intervals: Array<{ from: string; to: string }>, withYear = false): string {
  return intervals.map((iv) => formatRange(iv.from, iv.to, withYear)).join(", ");
}

/** 월 목록만 간단히: "6·11월" (근거 한 줄용) */
export function formatMonths(intervals: Array<{ from: string; to: string }>): string {
  const months: number[] = [];
  for (const iv of intervals) {
    const m = parse(iv.from).m;
    if (!months.includes(m)) months.push(m);
  }
  return `${months.join("·")}월`;
}

export function formatYear(y: number): string {
  return `${y}년`;
}

export const QUARTER_LABELS = ["1분기 (1~3월)", "2분기 (4~6월)", "3분기 (7~9월)", "4분기 (10~12월)"] as const; // 프로토타입 QLABEL과 같게(괄호 앞 띄어쓰기)

// ---- 조사(받침 판정) ----

function lastHangul(word: string): string | null {
  for (let i = word.length - 1; i >= 0; i--) {
    const c = word.charCodeAt(i);
    if (c >= 0xac00 && c <= 0xd7a3) return word[i];
    if (/[0-9]/.test(word[i])) return "영일이삼사오육칠팔구"[Number(word[i])];
    if (/[a-zA-Z]/.test(word[i])) return null;
  }
  return null;
}

/** 받침 유무. 한글이 아니면 null(그 경우 괄호형 조사로 둘 다 보여준다). */
export function batchim(word: string): { has: boolean; rieul: boolean } | null {
  const ch = lastHangul(word);
  if (!ch) return null;
  const jong = (ch.charCodeAt(0) - 0xac00) % 28;
  return { has: jong !== 0, rieul: jong === 8 };
}

export type JosaPair = "이/가" | "을/를" | "은/는" | "와/과" | "으로/로" | "이에요/예요" | "이라/라" | "아/야";

export function josa(word: string, pair: JosaPair): string {
  const b = batchim(word);
  const [withB, withoutB] = pair.split("/");
  if (!b) return `${word}${withB}(${withoutB})`;
  if (pair === "으로/로") return word + (b.has && !b.rieul ? "으로" : "로");
  // 와/과는 순서가 반대(받침 있으면 '과')
  if (pair === "와/과") return word + (b.has ? "과" : "와");
  return word + (b.has ? withB : withoutB);
}

/** "{닉네임}님" 호칭 */
export function honorific(nickname: string): string {
  return `${nickname}님`;
}
