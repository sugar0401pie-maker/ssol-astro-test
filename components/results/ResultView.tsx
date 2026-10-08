"use client";

import Link from "next/link";
// 저장한 결과 다시 보기. 서버가 저장된 입력으로 다시 계산해 보내 준다(해석 DB가 고쳐지면 새 문장으로 보인다).
import { useEffect, useState } from "react";
import AuthStep from "@/components/auth/AuthStep";
import FreeResultView from "@/components/test/FreeResultView";
import type { FreeResult } from "@/lib/report/freeResult";
import { useRealSession } from "./useSession";

export default function ResultView({ id }: { id: string }) {
  const session = useRealSession();
  const [data, setData] = useState<{ nickname: string; firstTime: boolean; result: FreeResult } | null>(null);
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

  if (session === undefined) return <p className="text-center text-cream/70">확인하는 중…</p>;
  if (session === null) return <AuthStep title="결과를 보려면 로그인해 주세요." onSignedIn={() => {}} />;
  if (error) return <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>;
  if (!data) return <p className="text-center text-cream/70">불러오는 중…</p>;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/results" className="text-sm text-cream/80 underline">← 내 결과</Link>
      <FreeResultView result={data.result} nickname={data.nickname} firstTime={data.firstTime} />
    </div>
  );
}
