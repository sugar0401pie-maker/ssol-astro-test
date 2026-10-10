"use client";

import Link from "next/link";
// 내 결과 목록 — 본인 결과만(서버가 로그인 사용자로 거른다). 각 결과는 지울 수 있다(저장 동의 문구의 약속).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiHeaders, getGuestToken } from "@/lib/guest/client";
import { signOut } from "@/lib/supabase/authClient";
import { useRealSession } from "./useSession";

interface Row {
  id: string;
  created_at: string;
  nickname: string;
  character: string;
  sun_sign: string;
  accuracy: string;
}

const dateKo = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
};

export default function ResultsList() {
  const session = useRealSession();
  const router = useRouter();
  // 로그인 안 했고 이 기기에 비회원 결과도 없으면 로그인 화면(/login, 별도 페이지 — owner 2026-10-10)으로.
  const needLogin = session === null && !getGuestToken(false);
  useEffect(() => {
    if (needLogin) router.replace("/login?next=/results");
  }, [needLogin, router]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session === undefined) return;
    // 로그인 안 했고 이 기기에 비회원 결과 열쇠도 없으면 목록을 부르지 않는다(로그인 화면).
    if (!session && !getGuestToken(false)) return;
    // 로그인 상태가 정해지면 목록을 받아 온다(계정 결과, 또는 이 기기의 비회원 결과). 상태 변경은 응답 콜백에서만.
    void fetch("/api/results", { headers: apiHeaders(session), cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) setError(data.error ?? "결과를 불러오지 못했어요.");
        else setRows(data.results);
      })
      .catch(() => setError("결과를 불러오지 못했어요."));
  }, [session]);

  async function remove(id: string) {
    if (session === undefined || !confirm("이 결과를 지울까요? 지우면 되돌릴 수 없어요.")) return;
    const res = await fetch(`/api/results/${id}`, { method: "DELETE", headers: apiHeaders(session) });
    if (res.ok) setRows((r) => r?.filter((x) => x.id !== id) ?? null);
    else setError("지우지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  if (session === undefined) return <p className="text-center text-cream/70">확인하는 중…</p>;
  if (needLogin) return <p className="text-center text-cream/70">로그인 화면으로 이동하는 중…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-cream">내 결과</h1>
      {session === null && (
        <p className="rounded-2xl border border-gold px-4 py-3 text-sm leading-relaxed text-cream/90">
          로그인하지 않고 이 기기에 저장한 결과예요. 결과를 열어 &lsquo;로그인하고 저장하기&rsquo;를 누르면 계정에 보관돼요(저장하지 않으면 30일 뒤 지워져요).
        </p>
      )}
      {error && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>}
      {rows === null && !error && <p className="text-cream/70">불러오는 중…</p>}
      {rows?.length === 0 && <p className="text-cream/80">아직 저장한 결과가 없어요.</p>}
      <ul className="flex flex-col gap-2">
        {rows?.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-cream/30 px-4 py-3 text-cream">
            <Link href={`/results/${r.id}`} className="flex flex-1 flex-col">
              <span className="font-bold">{r.sun_sign} · {r.character}</span>
              <span className="text-xs text-cream/70">{dateKo(r.created_at)} · {r.nickname}님 · 정확도 {r.accuracy}</span>
            </Link>
            <button className="shrink-0 text-xs text-cream/70 underline" onClick={() => remove(r.id)}>
              지우기
            </button>
          </li>
        ))}
      </ul>
      <Link href="/test" className="mt-2 w-full rounded-full bg-gold px-6 py-3 text-center font-bold text-navy">새로 테스트하기</Link>
      {session && (
        <button className="text-center text-xs text-cream/60 underline" onClick={() => void signOut()}>
          로그아웃
        </button>
      )}
    </div>
  );
}
