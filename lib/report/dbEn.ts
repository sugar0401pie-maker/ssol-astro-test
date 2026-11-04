// 영문 해석 DB 만들기(순수 함수 — 테스트 있음, 영문판 2026-11-04).
// 한국어 DB를 복사한 뒤 번역 덮어쓰기(data/astro/db/astro_db_en_overlay.json, scripts/build_en_db_overlay.py)를 입힌다.
// - 행을 찾는 칸(word·wish·character 등)은 한국어 그대로 둔다 — 코드가 한국어 키로 찾기 때문. 영문은 '<칸>_en'.
// - 번역이 없는 칸에 한글이 남아 있으면 빈 문자열로 바꾼다: 영문 화면에 한국어가 새지 않게(빈 문장은 화면 조립에서 빠진다 — fail safe).
import type { AstroDb } from "./db.ts";

export type EnOverlay = Record<string, Record<string, Record<string, string>>>;

const HANGUL = /[가-힣]/;
/** 행을 찾는 데 쓰는 칸(한국어 그대로) — scripts/build_en_db_overlay.py의 LOOKUP을 포함해야 한다(테스트가 확인) */
export const LOOKUP_FIELDS = new Set([
  "id", "character", "place", "name", "word", "wish", "competency", "kind", "domain", "level", "section", "slot",
  "area", "theme", "sun_element", "moon_element", "movement", "temperament", "wish_group", "edge", "condition",
  "planet_a", "planet_b", "state", "fit_words", "rule", "source", "tone", "variant", "sign", "element",
  "aspect_group", "category", "event", "fit", "house", "houses", "key", "natal_target", "planet", "planets", "priority",
  "soft", "style", "transit_planet", "pattern", "scope", "severity", "in_service_range",
]);

export function buildEnDb(ko: AstroDb, overlay: EnOverlay): AstroDb {
  const dbs: AstroDb["dbs"] = {};
  for (const [name, table] of Object.entries(ko.dbs)) {
    const ov = overlay[name] ?? {};
    dbs[name] = {
      ...table,
      rows: table.rows.map((r) => {
        const en = ov[r.id] ?? {};
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) {
          if (LOOKUP_FIELDS.has(k)) out[k] = v;
          else if (en[k] !== undefined) out[k] = en[k];
          else out[k] = typeof v === "string" && HANGUL.test(v) ? "" : v;
        }
        for (const [k, v] of Object.entries(en)) if (k.endsWith("_en")) out[k] = v;
        return out;
      }),
    };
  }
  return { ...ko, dbs };
}
