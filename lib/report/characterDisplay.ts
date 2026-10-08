// 캐릭터 표시 설정(마스터스펙 6장 2026-10-08 결정): 판정(역량 × 방식 → 20종)은 그대로 계산하되, 당분간 화면에는
// 동물 이름·일러스트·intro·share_line을 쓰지 않고 유형(A5 type_line + why_text)으로만 보여준다.
// 나중에 켜려면 true로 바꾼다 — 화면·후보 카드·내 결과 목록·AI 출력 검사가 모두 이 값을 따른다.
import type { AstroDb } from "./db.ts";

export const SHOW_CHARACTER = false;

/** 화면에 보이는 이름: 켜져 있으면 동물 이름, 아니면 유형 한 줄(A5 type_line). */
export function characterLabel(db: AstroDb, name: string): string {
  if (SHOW_CHARACTER) return name;
  return db.dbs.A5.rows.find((r) => r.character === name)?.type_line || "";
}
