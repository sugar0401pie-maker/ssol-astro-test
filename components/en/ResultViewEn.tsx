"use client";

// 영문 결과 화면 /en/results/{id}/{n}(결과 화면은 (가) — 한국어와 같은 FreeResultView를 lang="en"으로).
// 결과 문장은 서버가 영문 DB로 만들어 보낸다. 4~7장(유료)은 영문 결제·영문 유료 리포트가 생기기 전까지 잠긴 자리만 보인다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FreeResultView from "@/components/test/FreeResultView";
import { useRealSession } from "@/components/results/useSession";
import { apiHeaders } from "@/lib/guest/client";
import { lastPage } from "@/lib/results/lastPage";
import type { FreeResult } from "@/lib/report/freeResult";

export default function ResultViewEn({ id, page }: { id: string; page?: number }) {
  const session = useRealSession();
  const router = useRouter();
  const [data, setData] = useState<{ nickname: string; firstTime: boolean; result: FreeResult } | null>(null);
  const [state, setState] = useState<"loading" | "none" | "error">("loading");

  useEffect(() => {
    if (session === undefined) return;
    void fetch(`/api/results/${id}`, { headers: apiHeaders(session), cache: "no-store" })
      .then(async (res) => {
        const d = await res.json();
        if (res.status === 404 || res.status === 401) return setState("none");
        if (!res.ok) return setState("error");
        // 한국어판에서 만든 결과는 한국어 주소로
        if (d.lang !== "en") return router.replace(`/results/${id}/${page ?? 1}`);
        setData(d);
      })
      .catch(() => setState("error"));
  }, [session, id, page, router]);

  if (!data) {
    if (state === "none")
      return (
        <div className="box" lang="en">
          <p className="lead">We couldn’t find this result.</p>
          <p>It may have been saved with a different account or on another device.</p>
          {!session && (
            <Link href={`/en/login?next=${encodeURIComponent(`/en/results/${id}/${page ?? 1}`)}`} className="btn block mt-3">
              Log in
            </Link>
          )}
          <Link href="/en/start" className="btn ghost block mt-3">
            Start a new reading
          </Link>
        </div>
      );
    return <p className="text-center text-cream/70">{state === "error" ? "We couldn’t load your results. Please try again." : "Loading…"}</p>;
  }
  return (
    <div className="flex flex-col gap-6" lang="en">
      <FreeResultView
        lang="en"
        result={data.result}
        nickname={data.nickname}
        firstTime={data.firstTime}
        resultId={id}
        onAddTime={() => router.push("/en/start")}
        initialPage={page ?? lastPage(id)}
      />
      <div className="footer-ctrl">
        <span />
        <Link href="/en" className="linkish">
          Start over
        </Link>
      </div>
    </div>
  );
}
