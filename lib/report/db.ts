// 해석 DB(data/astro/db/astro_db_v1.2.json, owner·상담사 작성, 검수 전 DRAFT) 조회와 문장 틀 채우기.
// 원칙: 계산은 엔진, 문장은 DB, AI는 잇기만(05_DB목록). 무료 결과는 이 DB 문장만으로 만든다.
// DB 문장은 고치지 않고 그대로 쓴다 — 바꿀 일이 있으면 엑셀(검수본)을 고친 뒤 JSON을 다시 받는다.
// 이 파일은 순수 함수만 둔다(DB 객체를 인자로 받음) — 서버는 lib/report/dbData.ts로 한 번 읽어 넘긴다.
import { batchim, josa, type JosaPair } from "./format.ts";

export interface DbTable {
  db: string;
  name: string;
  columns: Record<string, string>;
  rows: Array<Record<string, string>>;
}

export interface AstroDb {
  version: string;
  status: string;
  dbs: Record<string, DbTable>;
}

export function row(db: AstroDb, table: string, id: string): Record<string, string> | null {
  return db.dbs[table]?.rows.find((r) => r.id === id) ?? null;
}

export function findRow(db: AstroDb, table: string, match: (r: Record<string, string>) => boolean): Record<string, string> | null {
  return db.dbs[table]?.rows.find(match) ?? null;
}

// ---- 이름 → DB ID 조각 ----

export const SIGN_ID: Record<string, string> = {
  양자리: "ARIES", 황소자리: "TAURUS", 쌍둥이자리: "GEMINI", 게자리: "CANCER", 사자자리: "LEO", 처녀자리: "VIRGO",
  천칭자리: "LIBRA", 전갈자리: "SCORPIO", 사수자리: "SAGITTARIUS", 염소자리: "CAPRICORN", 물병자리: "AQUARIUS", 물고기자리: "PISCES",
};

export const POINT_ID: Record<string, string> = {
  sun: "SUN", moon: "MOON", mercury: "MERCURY", venus: "VENUS", mars: "MARS", jupiter: "JUPITER",
  saturn: "SATURN", uranus: "URANUS", neptune: "NEPTUNE", pluto: "PLUTO", asc: "ASC", mc: "MC",
};

export const ELEMENT_ID: Record<string, string> = { 불: "FIRE", 흙: "EARTH", 공기: "AIR", 물: "WATER" };

/** 각도 이름 → A8·B3의 묶음(합 / 조화 / 긴장) */
export function aspectGroup(aspect: string): "CONJ" | "HARM" | "TENSE" {
  if (aspect === "합") return "CONJ";
  if (aspect === "삼분" || aspect === "육분") return "HARM";
  return "TENSE";
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

// ---- 문장 틀 채우기 ----

const JOSA_PAIRS: JosaPair[] = ["이/가", "을/를", "은/는", "와/과", "으로/로", "이에요/예요", "이라/라", "아/야"];

export class TemplateError extends Error {}

/**
 * DB 문장의 토큰을 채운다. {닉네임}(중괄호 하나), {{이름}}, {{이름:은/는}}(조사는 받침에 맞춰).
 * 값이 없는 토큰이 하나라도 있으면 예외 — 빈칸이 있는 문장을 화면에 내보내지 않는다(fail safe).
 */
export function fillTemplate(text: string, values: Record<string, string>): string {
  const out = text.replace(/\{\{([^{}:]+)(?::([^{}]+))?\}\}/g, (_, name: string, pair?: string) => {
    const v = values[name.trim()];
    if (v === undefined) throw new TemplateError(`값 없는 토큰: ${name}`);
    if (!pair) return v;
    if (!JOSA_PAIRS.includes(pair as JosaPair)) throw new TemplateError(`모르는 조사: ${pair}`);
    return josa(v, pair as JosaPair);
  });
  return out.replace(/\{닉네임\}/g, () => {
    const v = values["닉네임"];
    if (v === undefined) throw new TemplateError("값 없는 토큰: 닉네임");
    return v;
  });
}

/** 채우기에 실패하면 null(그 문장은 빼고 보여준다). */
export function tryFill(text: string | undefined, values: Record<string, string>): string | null {
  if (!text) return null;
  try {
    return fillTemplate(text, values);
  } catch (e) {
    if (e instanceof TemplateError) return null;
    throw e;
  }
}

/** 첫 문장만(휠 탭 시트에서 무료로 보여 주는 부분). */
export function firstSentence(text: string): string {
  const m = text.match(/^.+?[.!?](?=\s|$)/);
  return m ? m[0] : text;
}

export { batchim };
