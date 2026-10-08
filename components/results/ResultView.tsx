"use client";

import Link from "next/link";
// 저장한 결과 다시 보기. 서버가 저장된 입력으로 다시 계산해 보내 준다(해석 DB가 고쳐지면 새 문장으로 보인다).
import { useEffect, useState } from "react";
import AuthStep from "@/components/auth/AuthStep";
import { useRouter } from "next/navigation";
import FreeResultView from "@/components/test/FreeResultView";
import type { FreeResult } from "@/lib/report/freeResult";
import { useRealSession } from "./useSession";
import PaidReportView from "./PaidReportView";
import type { PaidReport } from "@/lib/report/aiReport";

export default function ResultView({ id }: { id: string }) {
  const session = useRealSession();
  const router = useRouter();
  const [data, setData] = useState<{ nickname: string; firstTime: boolean; paid: boolean; result: FreeResult } | null>(null);
  const [report, setReport] = useState<PaidReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    void fetch(`/api/results/${id}`, { headers: { authorization: `Bearer ${session.access_token}` }, cache: "no-store" })
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) setError(d.error ?? "결과를 불러오지 못했어요.");
        else setData(d);
      })
      .catch(() => setError("결과를 불러오지 못했어요."));
  }, [session, id]);

  // 결제했으면 유료 리포트를 받아 온다. 아직 만드는 중이면 4초마다 다시 묻는다(최대 3분 — 그 뒤엔 새로고침 안내).
  const paid = data?.paid === true;
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  useEffect(() => {
    if (!session || !paid) return;
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      try {
        const res = await fetch(`/api/results/${id}/report`, { headers: { authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
        const d = await res.json();
        if (stop) return;
        if (d.status === "ready") return setReport(d.report);
      } catch {
        /* 다음 차례에 다시 */
      }
      if (stop) return;
      if (Date.now() - started > 180_000) return setWaitedTooLong(true);
      setTimeout(tick, 4000);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [session, paid, id]);

  if (session === undefined) return <p className="text-center text-cream/70">확인하는 중…</p>;
  if (session === null) return <AuthStep title="결과를 보려면 로그인해 주세요." onSignedIn={() => {}} />;
  if (error) return <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>;
  if (!data) return <p className="text-center text-cream/70">불러오는 중…</p>;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/results" className="text-sm text-cream/80 underline">← 내 결과</Link>
      <FreeResultView
        result={data.result}
        nickname={data.nickname}
        firstTime={data.firstTime}
        resultId={id}
        // C등급: 시간을 알게 됐으면 테스트를 다시(새 결과로 저장된다)
        onAddTime={() => router.push("/test")}
        paidContent={
          data.paid ? (
            report ? (
              <PaidReportView report={report} />
            ) : (
              <p className="rounded-2xl border border-gold px-4 py-6 text-center text-sm leading-relaxed text-cream">
                {waitedTooLong
                  ? "리포트를 만드는 데 시간이 걸리고 있어요. 잠시 뒤 새로고침해 주세요."
                  : "결제가 확인됐어요. 연말부터 앞으로 5년까지, 전체 리포트를 쓰고 있어요(20~60초)."}
              </p>
            )
          ) : undefined
        }
      />
    </div>
  );
}
