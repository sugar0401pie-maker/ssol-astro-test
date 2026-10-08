import { resolveOwner } from "@/lib/results/owner";
import { NextRequest, NextResponse } from "next/server";
import { wishContextOf } from "@/lib/astro/wish";
import { ASTRO_DB } from "@/lib/report/dbData";
import { prepareSkeleton, previewLines } from "@/lib/report/prepare";
import { computeFree } from "@/lib/results/compute";
import { getResult, isUuid } from "@/lib/results/store";

// 결제 전 페이월 미리보기(디자인가이드 2장: 유료 섹션은 제목과 두괄식 첫 문장만 선명, 본문 블러).
// DB 뼈대의 첫 문장 하나씩만 보낸다 — 나머지 본문·표·근거는 결제 후 /report에서만. AI는 부르지 않는다. 본인 결과만.
export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/results/[id]/preview">) {
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "결과를 찾을 수 없어요. 처음부터 다시 시도해 주세요." }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
  try {
    const row = await getResult(owner, id);
    if (!row) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
    const c = computeFree(row.birth_input, row.answers, row.nickname);
    if (c.kind !== "result") return NextResponse.json({ error: "결과를 다시 계산하지 못했어요." }, { status: 500 });
    const { skeleton } = prepareSkeleton({
      db: ASTRO_DB,
      resolved: c.birth.resolved,
      wishContext: wishContextOf(c.birth.stored, c.birth.accuracy),
      answers: row.answers,
      nickname: row.nickname,
      now: new Date(),
    });
    return NextResponse.json({ sections: previewLines(skeleton) });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "미리보기 실패");
    return NextResponse.json({ error: "미리보기를 불러오지 못했어요." }, { status: 500 });
  }
}
