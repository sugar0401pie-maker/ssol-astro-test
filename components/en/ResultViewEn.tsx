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
import type { PaidReport } from "@/lib/report/aiReport";
import PaidReportView from "@/components/results/PaidReportView";
import Toast, { useToast } from "@/components/ui/Toast";
import { takeFlash } from "@/lib/ui/flash";

export default function ResultViewEn({ id, page }: { id: string; page?: number }) {
  const session = useRealSession();
  const router = useRouter();
  const [data, setData] = useState<{ nickname: string; firstTime: boolean; paid: boolean; result: FreeResult } | null>(null);
  const [report, setReport] = useState<PaidReport | null>(null);
  const [slow, setSlow] = useState(false);
  const [state, setState] = useState<"loading" | "none" | "error">("loading");
  const [toast, setToast] = useToast();
  // 결제 완료 화면에서 넘긴 안내(08 §4 'Payment complete…')
  useEffect(() => {
    if (!data) return;
    const m = takeFlash();
    if (m) setToast(m);
  }, [data, setToast]);

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

  // 결제한 결과(지금은 관리자 무료 열람만 — 영문 결제는 아직 닫힘): 리포트가 다 될 때까지 4초마다 확인(한국어 ResultView와 같은 방식, 3분까지)
  const paid = data?.paid === true;
  useEffect(() => {
    if (session === undefined || !paid) return;
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      try {
        const res = await fetch(`/api/results/${id}/report`, { headers: apiHeaders(session), cache: "no-store" });
        const d = await res.json();
        if (stop) return;
        if (d.status === "ready") return setReport(d.report);
      } catch {
        /* 다음 차례에 다시 */
      }
      if (stop) return;
      if (Date.now() - started >= 60_000) setSlow(true);
      if (Date.now() - started > 180_000) return;
      setTimeout(tick, 4000);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [session, paid, id]);

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
        paidSection={
          paid && report && !report.partial
            ? (no) => (report.sections.some((s) => s.no === no) ? <PaidReportView report={report} signIndex={data.result.sunSignIndex} resultId={id} only={no} lang="en" /> : null)
            : undefined
        }
        paidPending={paid && (!report || report.partial) ? { slowText: slow ? "Your report is taking longer than usual. Please refresh in a moment. If it still doesn’t appear, email contact@ssolwellness.com and we’ll help right away." : null } : undefined}
      />
      <div className="footer-ctrl">
        <span />
        <Link href="/en" className="linkish">
          Start over
        </Link>
      </div>
      <Toast msg={toast} />
    </div>
  );
}
