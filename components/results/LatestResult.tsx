"use client";

// [내 결과 보기](패키지 v3): 로그인했으면 가장 최근 결과의 마지막으로 보던 페이지로 바로 간다.
// 로그인 안 했고 이 기기의 비회원 결과도 없으면 로그인 화면(LOGIN_BIG_MYRESULT), 결과가 하나도 없으면 B11 MYRESULT_NONE.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiHeaders, getGuestToken } from "@/lib/guest/client";
import { b11, useCopy } from "@/lib/copy/useCopy";
import { lastPage } from "@/lib/results/lastPage";
import { useRealSession } from "./useSession";

export default function LatestResult() {
  const session = useRealSession();
  const router = useRouter();
  const copy = useCopy();
  const [none, setNone] = useState(false);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null && !getGuestToken(false)) {
      router.replace("/login?next=/results/latest");
      return;
    }
    void fetch("/api/results", { headers: apiHeaders(session), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d: { results?: Array<{ id: string }> }) => {
        const first = d.results?.[0];
        if (first) router.replace(`/results/${first.id}/${lastPage(first.id)}`);
        else setNone(true);
      })
      .catch(() => setNone(true));
  }, [session, router]);

  if (!none) return <p className="text-center text-cream/70">내 결과를 여는 중…</p>;
  return (
    <div className="flex flex-col gap-4 text-center">
      <p className="text-cream">{b11(copy, "MYRESULT_NONE", "아직 저장된 결과가 없어요. 테스트를 먼저 해 볼까요?")}</p>
      <Link href="/test" className="btn block">
        테스트 하기
      </Link>
    </div>
  );
}
