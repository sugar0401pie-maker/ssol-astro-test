"use client";

// 관리자 메인(owner 2026-11-09): 날짜를 고르면 그날·누적 숫자와 앞 단계 대비 전환율, 참가자 엑셀 내려받기.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getRealSession } from "@/lib/supabase/browser";
import { apiHeaders } from "@/lib/guest/client";
import { todayKst, type AdminStats, type FunnelRow } from "@/lib/admin/stats";

const pct = (v: number | null) => (v === null ? "–" : `${v}%`);
const num = (v: number) => v.toLocaleString("ko-KR");

export default function AdminDashboard() {
  const [day, setDay] = useState(() => todayKst());
  const [rows, setRows] = useState<FunnelRow[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "day" | "upto">("");

  const load = useCallback(async () => {
    setError("");
    const session = await getRealSession();
    const res = await fetch(`/api/admin/stats?day=${day}`, { headers: apiHeaders(session), cache: "no-store" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRows(null);
      return setError(d.error ?? "불러오지 못했어요.");
    }
    setRows(d.rows);
    setStats(d.stats);
  }, [day]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function download(scope: "day" | "upto") {
    setBusy(scope);
    setError("");
    try {
      const session = await getRealSession();
      const res = await fetch(`/api/admin/export?day=${day}&scope=${scope}`, { headers: apiHeaders(session), cache: "no-store" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return setError(d.error ?? "엑셀 파일을 만들지 못했어요.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `astro_participants_${scope === "day" ? day : `upto_${day}`}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <h1 className="big">쏠 아스트로 하우스 관리자</h1>

      <label className="small flex flex-wrap items-center gap-2">
        기준 날짜(한국)
        <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="rounded-lg px-2 py-1 text-navy" />
      </label>

      {error && (
        <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">
          {error}{" "}
          {error.includes("관리자") && (
            <Link href="/login?next=/admin" className="underline">
              로그인하기
            </Link>
          )}
        </p>
      )}

      {rows && stats && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-cream/30 text-left text-cream/70">
                  <th className="py-2 pr-2">단계</th>
                  <th className="py-2 pr-2 text-right">그날</th>
                  <th className="py-2 pr-2 text-right">전 단계 대비</th>
                  <th className="py-2 pr-2 text-right">누적</th>
                  <th className="py-2 text-right">전 단계 대비</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-cream/10">
                    <td className="py-2 pr-2">
                      {r.label}
                      <div className="text-[11px] text-cream/60">{r.note}</div>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">{num(r.day)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{pct(r.dayRate)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{num(r.total)}</td>
                    <td className="py-2 text-right tabular-nums">{pct(r.totalRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="small flex flex-col gap-1">
            <li>
              매출 — 그날 {num(stats.krw.day)}원{stats.usd_cents.day ? ` + US$${(stats.usd_cents.day / 100).toFixed(2)}` : ""} · 누적 {num(stats.krw.total)}원
              {stats.usd_cents.total ? ` + US$${(stats.usd_cents.total / 100).toFixed(2)}` : ""}
            </li>
            <li>
              테스트 본 사람 중 로그인 — 그날 {num(stats.members.day)}명 · 누적 {num(stats.members.total)}명
            </li>
          </ul>
          <p className="text-xs text-cream/60">
            방문·시작·출생 정보는 브라우저 기준이고 2026-10-11부터 기록돼요. 누적은 기준 날짜가 끝나는 때(한국 자정)까지예요. 비회원 결과는 30일 뒤 지워져서 &lsquo;테스트 본 사람&rsquo; 누적에서 빠지고, 결제는 주문 기록이 남아 그대로 세요.
          </p>
        </>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" className="btn block" disabled={!!busy} onClick={() => void download("day")}>
          {busy === "day" ? "만드는 중…" : `${day} 참가자 엑셀 받기`}
        </button>
        <button type="button" className="btn block ghost" disabled={!!busy} onClick={() => void download("upto")}>
          {busy === "upto" ? "만드는 중…" : `${day}까지 전체 참가자 엑셀 받기`}
        </button>
        <p className="text-xs text-cream/60">
          참가 시각·닉네임·로그인 수단·이메일·결제·유형·답·유입 경로가 들어가요. 출생 날짜·시각·장소는 개인정보처리방침(출생차트 도출에만 사용)에 따라 넣지 않아요. 내려받은 파일은 개인정보라 안전한 곳에만 보관해 주세요.
        </p>
      </div>

      <Link href="/admin/reports" className="small underline">
        AI 없이 나간 리포트 다시 만들기 →
      </Link>
    </section>
  );
}
