"use client";

// 리포트 메일 시험(owner 2026-10-11): 로그인한 내 계정 메일로 '지우' 목업 리포트를 한 번 보낸다.
import Link from "next/link";
import { useState } from "react";
import { useRealSession } from "@/components/results/useSession";

export default function MailTest() {
  const session = useRealSession();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!session) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/mail-test", { method: "POST", headers: { authorization: `Bearer ${session.access_token}` } });
      const d = await res.json().catch(() => ({}));
      setMsg(res.ok ? `${d.to}로 보냈어요. 메일함(스팸함 포함)을 확인해 주세요.` : (d.error ?? "보내지 못했어요."));
    } catch {
      setMsg("보내지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (session === undefined) return <p className="small">확인하는 중…</p>;
  if (!session)
    return (
      <>
        <h1 className="big">리포트 메일 시험</h1>
        <p className="small">메일을 받을 계정으로 먼저 로그인해 주세요.</p>
        <Link href="/login?next=/mail-test" className="btn block">
          로그인하기
        </Link>
      </>
    );
  return (
    <>
      <h1 className="big">리포트 메일 시험</h1>
      <p className="small">지금 로그인한 계정의 메일로 &apos;지우&apos;님 목업 리포트를 보내요. 다른 주소로는 보낼 수 없어요.</p>
      <button type="button" className="btn block" disabled={busy} onClick={() => void send()}>
        {busy ? "보내는 중…" : "시험 메일 보내기"}
      </button>
      {msg && <p className="small">{msg}</p>}
    </>
  );
}
