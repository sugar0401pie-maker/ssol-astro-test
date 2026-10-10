import { NextResponse } from "next/server";
import { ASTRO_DB } from "@/lib/report/dbData";
import { row } from "@/lib/report/db";

// 화면 고정 문구 일부만 보낸다 — 화면이 1MB 넘는 DB를 통째로 받지 않게.
// A15: 결과 전 화면 문구. B14(2026-10-10): 오류·빈 화면·로딩 문구({닉네임}은 화면이 채운다).
export const runtime = "nodejs";

const A15_IDS = ["FIX_LOADING", "FIX_PRIVACY_NOTE"] as const;
// B11 화면 고정 문구 중 로그인·임시 계정·쏘웰라 잠금·결과 없음(패키지 v3, 2026-10-10)
const B11_IDS = [
  "LOGIN_BIG", "LOGIN_SMALL", "LOGIN_KAKAO_START", "LOGIN_GUEST_LINK", "LOGIN_GUEST_NOTE", "LOGIN_BIG_MYRESULT", "LOGIN_BIG_SAVE",
  "LOGIN_BIG_SOWELLA", "LOGIN_BIG_PAID", "LOGIN_SMALL_GUEST", "LOGIN_DONE", "SOWELLA_GUEST_LOCK", "MYRESULT_NONE", "SHARE_NOTE_LOCKED",
] as const;

export async function GET() {
  const b14 = Object.fromEntries(
    (ASTRO_DB.dbs.B14?.rows ?? []).map((r) => [r.id, { title: r.title ?? "", body: r.body ?? "", button: r.button === "—" ? "" : r.button ?? "", alt: r.alt ?? "" }]),
  );
  const b11 = Object.fromEntries(B11_IDS.map((id) => [id, row(ASTRO_DB, "B11", id)?.text ?? ""]));
  return NextResponse.json({ ...Object.fromEntries(A15_IDS.map((id) => [id, row(ASTRO_DB, "A15", id)?.text ?? ""])), B14: b14, B11: b11 });
}
