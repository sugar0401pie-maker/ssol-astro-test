// 영문 해석 DB(서버 전용, 한 번만 만든다). 화면에는 서버가 고른 문장만 보낸다.
import "server-only";
import overlay from "@/data/astro/db/astro_db_en_overlay.json";
import { ASTRO_DB } from "./dbData";
import { buildEnDb, type EnOverlay } from "./dbEn";
import type { AstroDb } from "./db";

export const ASTRO_DB_EN: AstroDb = buildEnDb(ASTRO_DB, overlay as EnOverlay);
