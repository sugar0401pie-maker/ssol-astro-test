import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { ASTRO_DB } from "@/lib/report/dbData";
import { row } from "@/lib/report/db";

// 없는 주소(예: /results/{id}/9) — 해석 DB B14 ERR_RESULT_NONE 문구(Next 기본 영어 404 대신)
export default function NotFound() {
  const r = row(ASTRO_DB, "B14", "ERR_RESULT_NONE");
  return (
    <main className="flex w-full flex-1 flex-col gap-6 pb-8 pt-7">
      <section className="screen on">
        <h1 className="big">{r?.title || "이 별지도는 찾을 수 없어요"}</h1>
        <p className="small">{r?.body || "링크가 오래되었거나 결과가 지워졌을 수 있어요."}</p>
        <div className="stack">
          <Link href="/" className="btn block">
            {r?.button || "새로 시작하기"}
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
