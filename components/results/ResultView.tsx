"use client";

import Link from "next/link";
// 저장한 결과 다시 보기. 서버가 저장된 입력으로 다시 계산해 보내 준다(해석 DB가 고쳐지면 새 문장으로 보인다).
import { useEffect, useState } from "react";
import AuthStep from "@/components/auth/AuthStep";
import { apiHeaders } from "@/lib/guest/client";
import TempPayBanner from "./TempPayBanner";
import Toast, { useToast } from "@/components/ui/Toast";
import { takeFlash } from "@/lib/ui/flash";
import { useRouter } from "next/navigation";
import FreeResultView from "@/components/test/FreeResultView";
import type { FreeResult } from "@/lib/report/freeResult";
import { useRealSession } from "./useSession";
import { track } from "@/lib/analytics/track";
import PaidReportView from "./PaidReportView";
import { b14, useCopy } from "@/lib/copy/useCopy";
import type { PaidReport } from "@/lib/report/aiReport";
import { lastPage } from "@/lib/results/lastPage";

/** 리포트가 30초 동안 아무것도 안 오면 한 번 다시 만들기 요청(owner 2026-10-11) */
const REPORT_RETRY_MS = 30_000;
/** 그래도 안 뜰 때 고객센터 안내(Claude 초안, owner 검토 가능) */
const REPORT_SUPPORT_NOTE = "그래도 리포트가 보이지 않으면 contact@ssolwellness.com으로 알려 주세요. 결제 내역을 확인해 바로 도와드릴게요.";

export default function ResultView({ id, page }: { id: string; page?: number }) {
  const session = useRealSession();
  const copy = useCopy();
  const router = useRouter();
  const [data, setData] = useState<{ nickname: string; firstTime: boolean; paid: boolean; guest?: boolean; result: FreeResult } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [report, setReport] = useState<PaidReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 로그인하고 돌아왔을 때 등 앞 화면이 남긴 안내(프로토타입 backToResult의 toast)
  const [toast, setToast] = useToast();
  const loaded = !!data;
  useEffect(() => {
    if (!loaded) return;
    const m = takeFlash();
    if (m) setToast(m);
  }, [loaded, setToast]);

  useEffect(() => {
    if (session === undefined) return;
    // 로그인했으면 계정으로, 아니면 이 브라우저의 비회원 열쇠로 연다.
    void fetch(`/api/results/${id}`, { headers: apiHeaders(session), cache: "no-store" })
      .then(async (res) => {
        const d = await res.json();
        if (res.status === 404 || res.status === 401) setNotFound(true);
        else if (!res.ok) setError(d.error ?? "결과를 불러오지 못했어요.");
        else setData(d);
      })
      .catch(() => setError("결과를 불러오지 못했어요."));
  }, [session, id]);

  // 결제했으면 유료 리포트를 받아 온다. 아직 만드는 중이면 4초마다 다시 묻는다.
  // owner 2026-10-11: 30초 동안 아무것도 못 받으면 한 번 다시 만들기를 요청하고, 그래도(60초) 안 뜨면 고객센터 안내.
  // 안내를 띄운 뒤에도 3분까지는 계속 물어서, 늦게라도 완성되면 그대로 보여 준다.
  const paid = data?.paid === true;
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  useEffect(() => {
    if (session === undefined || !paid) return;
    let stop = false;
    const started = Date.now();
    let retried = false;
    let gotAny = false;
    const tick = async () => {
      const elapsed = Date.now() - started;
      const retry = !retried && !gotAny && elapsed >= REPORT_RETRY_MS;
      if (retry) retried = true;
      try {
        const res = await fetch(`/api/results/${id}/report${retry ? "?retry=1" : ""}`, { headers: apiHeaders(session), cache: "no-store" });
        const d = await res.json();
        if (stop) return;
        if (d.status === "ready") {
          track("report_ready", {}, `report_ready:${id}`);
          return setReport(d.report);
        }
        // 쓰는 중: 받아 두기만 하고(화면에는 다 된 뒤에만 보여 줌) 계속 기다린다
        if (d.report) {
          gotAny = true;
          setReport(d.report);
        }
      } catch {
        /* 다음 차례에 다시 */
      }
      if (stop) return;
      const now = Date.now() - started;
      // 재시도 뒤 30초(=60초)까지 아무것도 없거나, 일부만 온 채 2분이 지나면 고객센터 안내
      if ((!gotAny && now >= REPORT_RETRY_MS * 2) || now >= 120_000) setWaitedTooLong(true);
      if (now > 180_000) return;
      setTimeout(tick, 4000);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [session, paid, id]);

  if (session === undefined) return <p className="text-center text-cream/70">확인하는 중…</p>;
  // 이 기기의 비회원 결과도 계정 결과도 아니면: 다른 기기·계정에서 저장한 결과일 수 있다.
  if (notFound && !session) return <AuthStep title="이 결과를 보려면 저장한 계정으로 로그인해 주세요." onSignedIn={() => location.reload()} />;
  if (notFound)
    return (
      <div className="box">
        <p className="lead">{b14(copy, "ERR_RESULT_NONE", "title", "결과를 찾을 수 없어요.")}</p>
        <p>{b14(copy, "ERR_RESULT_NONE", "body", "다른 계정으로 저장한 결과일 수 있어요.")}</p>
        <Link href="/test" className="btn block mt-3">
          {b14(copy, "ERR_RESULT_NONE", "button", "새로 시작하기")}
        </Link>
      </div>
    );
  if (error) return <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>;
  if (!data) return <p className="text-center text-cream/70">불러오는 중…</p>;
  return (
    <div className="flex flex-col gap-6">
      <FreeResultView
        result={data.result}
        nickname={data.nickname}
        firstTime={data.firstTime}
        resultId={id}
        // C등급: 시간을 알게 됐으면 테스트를 다시(새 결과로 저장된다)
        onAddTime={() => router.push("/test")}
        // 주소에 페이지가 없으면(/results/{id} — 결제 후 돌아올 때 등) 이 기기에 기억한 마지막 페이지로 연다
        initialPage={page ?? lastPage(id)}
        // 임시 계정으로 결제했으면 4~7장 맨 위에 보관(가입) 안내(프로토타입 .temp-banner)
        tempBanner={data.guest && !session && data.paid ? (n) => <TempPayBanner banner={data.result.tempPay.banner} loginBig={data.result.tempPay.loginBigPaid} resultId={id} page={n} /> : undefined}
        // 리포트는 다 만들어진 뒤에만 보여 준다(owner 2026-10-14: 다 쓴 부분부터 보여 주지 않음). 쓰는 중이면 잠긴 자리 + 도는 별
        paidSection={
          data.paid && report && !report.partial
            ? (no) => (report.sections.some((s) => s.no === no) ? <PaidReportView report={report} signIndex={data.result.sunSignIndex} resultId={id} only={no} /> : null)
            : undefined
        }
        // 결제 후 리포트를 쓰는 동안에도 유료 섹션 제목·첫 문장 자리를 그대로 두고, 완성되면 같은 자리에서 채운다.
        paidPending={
          data.paid && (!report || report.partial)
            ? {
                slowText: waitedTooLong
                  ? `${b14(copy, "ERR_AI_SLOW", "title", "", data.nickname)} ${b14(copy, "ERR_AI_SLOW", "body", "리포트를 만드는 데 시간이 걸리고 있어요. 잠시 뒤 새로고침해 주세요.", data.nickname)} ${REPORT_SUPPORT_NOTE}`.trim()
                  : null,
              }
            : undefined
        }
      />
      {/* 프로토타입 결과 화면 .footer-ctrl: 처음부터 다시(첫 화면으로) */}
      <div className="footer-ctrl">
        <span />
        <Link href="/" className="linkish">
          처음부터 다시
        </Link>
      </div>
      <Toast msg={toast} />
    </div>
  );
}
