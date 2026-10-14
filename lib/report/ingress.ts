// 별자리 이동 한 줄·리턴 근거 문구(해석 DB A16b, v1.2.3 2026-10-14).
// 예전에는 모든 별자리 이동에 A16 TERM_INGRESS 공통 문장을 썼다 — 이제 행성별 문장(ING_*)을 쓰고,
// 같은 행성끼리 만나는 근거 구절은 "목성이 목성과 겹치는" 대신 RET_*·SELF_ASPECT로 쓴다. 표가 없으면 예전 문장(fail safe).
import { POINT_ID, pad2, row, tryFill, type AstroDb } from "./db.ts";

const POINT_KO: Record<string, string> = {
  sun: "태양", moon: "달", mercury: "수성", venus: "금성", mars: "화성", jupiter: "목성",
  saturn: "토성", uranus: "천왕성", neptune: "해왕성", pluto: "명왕성", chiron: "키론",
};

const text = (db: AstroDb, table: string, id: string, col = "text") => row(db, table, id)?.[col] ?? "";

/** 하우스 별명(A16 TERM_Hxx nickname, 예: "배움·말의 자리") */
function houseArea(db: AstroDb, h: number): string {
  return text(db, "A16", `TERM_H${pad2(h)}`, "nickname") || `${h}하우스`;
}

/** 별자리 이동 설명 한 줄. 하우스를 모르면(시간 모름) ING_NOTIME. */
export function ingressLine(db: AstroDb, planet: string, house: number | null | undefined): string {
  const fallback = text(db, "A16", "TERM_INGRESS", "meaning_line");
  const id = planet === "chiron" ? "CHIRON" : POINT_ID[planet];
  if (house) {
    const filled = tryFill(text(db, "A16b", `ING_${id}`) || undefined, { 하우스영역: houseArea(db, house) });
    if (filled) return filled;
  }
  return tryFill(text(db, "A16b", "ING_NOTIME") || undefined, { 행성: POINT_KO[planet] ?? planet }) ?? fallback;
}

/** 같은 행성끼리 만나는 근거 구절('-는'으로 끝남). 합이면 리턴 문구, 그 밖 각도면 SELF_ASPECT. 없으면 null(호출하는 쪽의 기본 구절). */
export function selfAspectPhrase(db: AstroDb, planet: string, conj: boolean): string | null {
  if (conj) {
    const ret = text(db, "A16b", `RET_${planet === "chiron" ? "CHIRON" : POINT_ID[planet]}`);
    if (ret) return ret;
  }
  return tryFill(text(db, "A16b", "SELF_ASPECT") || undefined, { 행성: POINT_KO[planet] ?? planet });
}

