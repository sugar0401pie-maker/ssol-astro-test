import { NextResponse } from "next/server";
import { ASTRO_DB } from "@/lib/report/dbData";
import { row } from "@/lib/report/db";

// 결과 전 화면에 쓰는 고정 문구(A15) 몇 개만 보낸다 — 화면이 690KB DB를 통째로 받지 않게.
export const runtime = "nodejs";

const IDS = ["FIX_LOADING", "FIX_PRIVACY_NOTE"] as const;

export async function GET() {
  return NextResponse.json(Object.fromEntries(IDS.map((id) => [id, row(ASTRO_DB, "A15", id)?.text ?? ""])));
}
