import "server-only";
// 리포트 메일 시험용 목업(owner 2026-10-11 "지우씨의 리포트(목업)"). 스펙 샘플(1996-04-01 10:17 경기)로
// DB 문장 뼈대만 만든다(AI 호출 0회, 저장 없음). 실제 사용자 정보는 쓰지 않는다.
import { wishContextOf } from "@/lib/astro/wish";
import { ASTRO_DB } from "@/lib/report/dbData";
import { prepareSkeleton } from "@/lib/report/prepare";
import { birthKeyOf } from "@/lib/report/variants";
import type { ReportForEmail } from "@/lib/report/reportEmail";
import { computeFree, parseResultRequest } from "./compute";

export const MOCK_NICKNAME = "지우";

export function buildMockReport(now = new Date()): ReportForEmail {
  const parsed = parseResultRequest({
    birth: { year: 1996, month: 4, day: 1, time: { kind: "exact", hour: 10, minute: 17 }, place: { region: "경기" } },
    answers: { q1: "직업·커리어", q2: "변화", q3: "도약" },
    nickname: MOCK_NICKNAME,
  });
  if (!parsed.ok) throw new Error("목업 입력 오류");
  const c = computeFree(parsed.input, parsed.answers, parsed.nickname);
  if (c.kind !== "result") throw new Error("목업 계산 오류");
  const { skeleton } = prepareSkeleton({
    db: ASTRO_DB,
    resolved: c.birth.resolved,
    wishContext: wishContextOf(c.birth.stored, c.birth.accuracy),
    answers: parsed.answers,
    nickname: MOCK_NICKNAME,
    now,
    birthKey: birthKeyOf(parsed.input),
  });
  return skeleton;
}
