// 표현 변형(2026-10-09 패키지, 마스터스펙 6-1-1·04_데이터 text_variants): A12·A13의 원래 문장 1개 + 변형(A12b·A13b) 4개 중
// 하나를 출생정보 해시(FNV-1a)로 고른다 — 같은 사람은 다시 열어도 같은 문장, 사람마다 다른 문장.
// 해시 열쇠는 우리 저장 형식의 출생정보로 만든다(프로토타입과 글자 모양이 달라 같은 사람이라도 프로토타입과 다른 표현이 나올 수 있다).
// B11 요약 문장 틀({이름}, {이름:이/가})도 여기서 채운다.
import type { BirthInput } from "../astro/birth.ts";
import type { AstroDb } from "./db.ts";
import { josa, type JosaPair } from "./format.ts";

/** 출생정보 → 해시 열쇠(생년월일·시간 방식·시간·시간대·출생지). */
export function birthKeyOf(b: Pick<BirthInput, "year" | "month" | "day" | "time" | "place">): string {
  const t = b.time;
  const time = t.kind === "exact" ? `${t.hour}|${t.minute}|exact|` : t.kind === "band" ? `||band|${t.band}` : "||unknown|";
  return [b.year, b.month, b.day, time, b.place.label].join("|");
}

/** FNV-1a 32비트(프로토타입 hashPick과 같은 계산) → 0..n-1 */
export function hashPick(key: string, n: number, salt: string): number {
  const str = `${key}#${salt}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % n;
}

/** 원래 문장 + 변형 행(variant 순) 중 하나. 원래 문장이 비었으면 변형만으로. */
export function pickVariant(db: AstroDb, first: string | undefined, table: "A12b" | "A13b", match: (r: Record<string, string>) => boolean, key: string, salt: string): string {
  const rows = (db.dbs[table]?.rows ?? []).filter(match).sort((a, b) => Number(a.variant) - Number(b.variant));
  const pool = [first, ...rows.map((r) => r.text)].filter((x): x is string => !!x);
  return pool.length ? pool[hashPick(key, pool.length, salt)] : "";
}

const A12_SLOT_CODE = { intro_match: "IM", intro_differ: "ID", closing: "CL" } as const;

/** A12(2026 회고 첫 문단·마무리) 표현 고르기. */
export function a12Variant(db: AstroDb, a12: Record<string, string>, slot: keyof typeof A12_SLOT_CODE, key: string): string {
  return pickVariant(db, a12[slot], "A12b", (r) => r.word === a12.word && r.slot === slot, key, `A12${A12_SLOT_CODE[slot]}${a12.word}`);
}

/** A13(바람 판정 문장) 표현 고르기. slot: text(판정·열리는 해) | fallback_text(열리는 해 없음). salt로 같은 칸을 다른 자리에서 다르게. */
export function a13Variant(db: AstroDb, a13: Record<string, string>, key: string, slot: "text" | "fallback_text" = "text", salt = ""): string {
  return pickVariant(db, a13[slot], "A13b", (r) => r.wish === a13.wish && r.level === a13.level && r.slot === slot, key, `A13${a13.id}${slot === "text" ? "" : slot}${salt}`);
}

/** B11 요약 문장 틀: {이름}, {이름:이/가}. 값이 없는 칸이 있으면 null(fail safe). */
export function fillSummary(template: string | undefined, values: Record<string, string>): string | null {
  if (!template) return null;
  let missing = false;
  const out = template.replace(/\{([^{}:]+)(?::([^{}]+))?\}/g, (_, name: string, pair?: string) => {
    const v = values[name.trim()];
    if (v === undefined || v === "") {
      missing = true;
      return "";
    }
    return pair ? josa(v, pair as JosaPair) : v;
  });
  return missing ? null : out;
}

/** B11 행 text */
export function b11(db: AstroDb, id: string): string {
  return db.dbs.B11?.rows.find((r) => r.id === id)?.text ?? "";
}
