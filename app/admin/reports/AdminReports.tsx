"use client";

// 관리자 화면: AI 없이 나간 결제 리포트를 새 키로 다시 써서 고객에게 다시 보낸다(owner 2026-11-08).
import { useCallback, useEffect, useState } from "react";
import { getRealSession } from "@/lib/supabase/browser";
import { apiHeaders } from "@/lib/guest/client";

type Item = { id: string; paidAt: string | null; lang: "ko" | "en"; member: boolean };
const RESULT_LABEL: Record<string, string> = {
  redone_emailed: "다시 만들고 메일 보냄",
  redone_no_email: "다시 만듦(메일 주소 없음 — 비회원·영문)",
  ai_still_failing: "AI가 아직 안 돼요 — 키·크레딧을 먼저 확인해 주세요(리포트는 그대로)",
  skipped: "건너뜀",
};

export default function AdminReports() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const load = useCallback(async () => {
    const session = await getRealSession();
    const res = await fetch("/api/admin/reports", { headers: apiHeaders(session), cache: "no-store" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setError(d.error ?? "불러오지 못했어요.");
    setError("");
    setItems(d.items);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function runAll() {
    setBusy(true);
    try {
      for (;;) {
        const session = await getRealSession();
        const res = await fetch("/api/admin/reports", { method: "POST", headers: apiHeaders(session) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          setLog((l) => [...l, d.error ?? "실패"]);
          break;
        }
        const done = d.done as Array<{ id: string; result: string }>;
        setLog((l) => [...l, ...done.map((x) => `${x.id.slice(0, 8)} · ${RESULT_LABEL[x.result] ?? x.result}`)]);
        if (done.length === 0 || done.some((x) => x.result === "ai_still_failing")) break;
      }
    } finally {
      setBusy(false);
      void load();
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="big">AI 없이 나간 리포트 다시 만들기</h1>
      {error && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>}
      {items && (
        <>
          <p className="small">
            대상 {items.length}건 · 회원 {items.filter((i) => i.member).length}건(메일로 다시 보냄) · 비회원 {items.filter((i) => !i.member).length}건(리포트만 바뀜)
          </p>
          <p className="text-xs text-cream/70">먼저 OpenAI 키·크레딧을 고친 뒤 누르세요. AI가 아직 안 되면 아무것도 바꾸지 않고 멈춥니다. 한 건에 20~60초 걸려요.</p>
          <button type="button" className="btn block" disabled={busy || items.length === 0} onClick={() => void runAll()}>
            {busy ? "다시 만드는 중…" : "전부 다시 만들어 보내기"}
          </button>
        </>
      )}
      {log.length > 0 && (
        <ul className="text-xs text-cream/80">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
