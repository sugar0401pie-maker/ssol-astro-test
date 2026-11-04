"use client";

// 영문 '내 결과' 목록 /en/results(영문판 2026-11-04). 한국어 목록과 같은 API(/api/results) — 계정 또는 이 기기의 비회원 결과.
// 각 줄은 그 결과의 영문 주소로(한국어판에서 만든 결과는 열면 한국어 주소로 넘어간다).
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRealSession } from "@/components/results/useSession";
import { apiHeaders } from "@/lib/guest/client";
import { EN, formatDateEn } from "@/lib/report/lang";

type Row = { id: string; created_at: string; nickname: string; sun_sign: string; last_page?: number | null; paid_at?: string | null };

export default function ResultsListEn() {
  const session = useRealSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (session === undefined) return;
    void fetch("/api/results", { headers: apiHeaders(session), cache: "no-store" })
      .then(async (res) => {
        const d = await res.json();
        if (res.status === 401) return setRows([]);
        if (!res.ok) return setFailed(true);
        setRows(d.results ?? []);
      })
      .catch(() => setFailed(true));
  }, [session]);

  return (
    <section className="screen on" lang="en" aria-labelledby="list-big">
      <h1 className="big" id="list-big">My results</h1>
      {failed && <p className="small">We couldn’t load your results. Please try again.</p>}
      {!rows && !failed && <p className="small">Loading…</p>}
      {rows && rows.length === 0 && (
        <>
          <p className="small">No saved results yet. Ready to take the test?</p>
          {!session && (
            <Link href="/en/login?next=/en/results" className="btn ghost block">
              Log in to see saved results
            </Link>
          )}
          <Link href="/en/start" className="btn block">
            Start the test
          </Link>
        </>
      )}
      {rows && rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/en/results/${r.id}/${r.last_page ?? 1}`} className="box block">
                <b>
                  {r.nickname} · {EN.sign(r.sun_sign)}
                </b>
                <span className="block text-sm opacity-80">{formatDateEn(r.created_at.slice(0, 10), true)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
