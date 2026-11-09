"use client";

// 관리자 화면 앞의 2차 암호 칸(owner 2026-11-09). 관리자 계정 로그인 + 암호를 맞혀야 children을 보여 준다.
// 실제 막는 곳은 서버(관리자 API 모두 adminGuard) — 이 화면은 안내일 뿐이다.
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getRealSession } from "@/lib/supabase/browser";
import { apiHeaders } from "@/lib/guest/client";

type State = "checking" | "login" | "locked" | "ok" | "error";

export default function AdminGate({ next, children }: { next: string; children: ReactNode }) {
  const [state, setState] = useState<State>("checking");
  const [configured, setConfigured] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    try {
      const session = await getRealSession();
      const res = await fetch("/api/admin/unlock", { headers: apiHeaders(session), cache: "no-store" });
      const d = await res.json();
      setConfigured(d.configured !== false);
      setState(d.state === "ok" ? "ok" : d.state === "locked" ? "locked" : "login");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void check());
  }, [check]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError("");
    try {
      const session = await getRealSession();
      const res = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { ...apiHeaders(session), "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? "확인하지 못했어요.");
      setPassword("");
      setState("ok");
    } finally {
      setBusy(false);
    }
  }

  if (state === "ok") return <>{children}</>;
  if (state === "checking") return <p className="small">확인하는 중…</p>;
  if (state === "error") return <p className="small">상태를 확인하지 못했어요. 새로고침해 주세요.</p>;
  if (state === "login")
    return (
      <section className="flex flex-col gap-3">
        <h1 className="big">관리자 화면</h1>
        <p className="small">관리자 계정으로 로그인해 주세요.</p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn block">
          로그인하기
        </Link>
      </section>
    );
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)}>
      <h1 className="big">관리자 암호</h1>
      <p className="small">관리자 화면을 열려면 암호를 입력해 주세요. 한 번 맞히면 이 브라우저에서 12시간 동안 다시 묻지 않아요.</p>
      {!configured && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">아직 암호가 설정되지 않았어요. Vercel에 ADMIN_PASSWORD를 넣고 다시 배포해 주세요.</p>}
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-lg px-3 py-2 text-navy"
        aria-label="관리자 암호"
      />
      {error && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>}
      <button type="submit" className="btn block" disabled={busy || !password}>
        {busy ? "확인하는 중…" : "열기"}
      </button>
    </form>
  );
}
