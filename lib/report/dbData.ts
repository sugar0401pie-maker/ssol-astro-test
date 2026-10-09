// 해석 DB를 서버에서 한 번만 읽어 둔다(약 690KB). 브라우저 번들에는 들어가지 않는다 — 화면에는 서버가 고른 문장만 보낸다.
import "server-only";
import data from "@/data/astro/db/astro_db_v1.3.json";
import type { AstroDb } from "./db";

export const ASTRO_DB = data as unknown as AstroDb;
