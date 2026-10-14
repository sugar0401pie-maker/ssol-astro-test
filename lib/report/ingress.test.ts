// 해석 DB v1.2.3(2026-10-14): A16b 별자리 이동 한 줄·리턴 근거 문구, B9 변형 순서, 리턴 주기 숫자 허용.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AstroDb } from "./db.ts";
import { ingressLine, selfAspectPhrase } from "./ingress.ts";
import { evidencePhrase } from "./paidSkeleton.ts";
import { movementLine } from "./movement.ts";
import { validateReport } from "./validate.ts";

const db: AstroDb = JSON.parse(readFileSync(new URL("../../data/astro/db/astro_db_v1.4.json", import.meta.url), "utf8"));

test("별자리 이동 한 줄: 행성별 문장 + 하우스 별명, 시간 모름이면 ING_NOTIME", () => {
  const j = ingressLine(db, "jupiter", 3);
  assert.ok(j.includes("확장의 별이 들어와") && !j.includes("{{"), j);
  assert.ok(ingressLine(db, "saturn", 10).includes("책임의 별"));
  const no = ingressLine(db, "uranus", null);
  assert.ok(no.startsWith("천왕성이 새 별자리로"), no);
});

test("같은 행성끼리 근거 구절: 합은 리턴 문구, 다른 각도는 SELF_ASPECT — '목성이 목성과' 같은 말이 나오지 않는다", () => {
  assert.equal(selfAspectPhrase(db, "jupiter", true), "목성이 12년 만에 태어날 때의 자리로 돌아오는");
  assert.equal(selfAspectPhrase(db, "saturn", false), "토성이 태어날 때 자신이 있던 자리와 각도를 이루는");
  const ev = evidencePhrase(db, { kind: "aspect", transit: "jupiter", target: "jupiter", aspect: "합", intervals: [], exact: "2027-06-01", value: 1, profection: false });
  assert.equal(ev, "목성이 12년 만에 태어날 때의 자리로 돌아오는");
  assert.equal(evidencePhrase(db, { kind: "aspect", transit: "saturn", target: "moon", aspect: "삼분", intervals: [], exact: "2028-06-07", value: 1, profection: false }), "토성이 달을 돕는");
});

test("B9: 같은 행이 다시 나오면 line → line_alt1 → line_alt2", () => {
  const y = { movementLabel: "움직이는 해" } as Parameters<typeof movementLine>[1];
  const r = db.dbs.B9.rows.find((x) => x.id === "MV_MOVE_CARD_CHG")!;
  assert.equal(movementLine(db, y, "활동", "도약", 0), r.line);
  assert.equal(movementLine(db, y, "활동", "도약", 1), r.line_alt1);
  assert.equal(movementLine(db, y, "활동", "도약", 2), r.line_alt2);
  assert.equal(movementLine(db, y, "활동", "도약", 5), r.line_alt2);
});

test("AI 검사: 리턴 주기 '12년 만에'·'약 29년 만에'는 허용, 다른 숫자는 여전히 실패", () => {
  const base = { allowedTokens: [], allowedNames: [], allowedHouses: new Set<number>() } as unknown as Parameters<typeof validateReport>[1];
  const codes = (t: string) => validateReport(t, base).map((i) => i.code);
  assert.ok(!codes("목성이 12년 만에 태어날 때의 자리로 돌아오는 해예요. 토성이 약 29년 만에 돌아오는 때입니다.").includes("digit_outside_token"));
  assert.ok(codes("3년 만에 좋은 일이 생겨요.").includes("digit_outside_token"));
});
