"use client";

// 쏘웰라로 가는 버튼(패키지 v3): 로그인한 계정만 쏘웰라에 들어갈 수 있다. 로그인하지 않았으면(임시 계정·비회원)
// 버튼이 [로그인하고 쏘웰라 시작하기]로 바뀌고 위에 B11 SOWELLA_GUEST_LOCK 안내 — 로그인하면 지금 결과가 계정으로 옮겨진다.
import { useEffect, useState } from "react";
import { b11, useCopy } from "@/lib/copy/useCopy";
import { getRealSession } from "@/lib/supabase/browser";

export const SOWELLA_CHAT_URL = "https://app.ssolwellnesshouse.com/chat";

export default function SowellaButton({ label, className, resultId, page }: { label: string; className: string; resultId?: string | null; page?: number }) {
  const copy = useCopy();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  useEffect(() => {
    void getRealSession().then((s) => setLoggedIn(!!s));
  }, []);
  if (loggedIn === false) {
    const back = resultId ? `/results/${resultId}/${page ?? 7}` : "/results/latest";
    return (
      <>
        <p className="guest-note" style={{ textAlign: "left" }}>
          {b11(copy, "SOWELLA_GUEST_LOCK", "쏘웰라는 로그인한 계정에서만 이용할 수 있어요. 로그인하면 지금 결과가 그대로 옮겨져요.")}
        </p>
        <a href={`/login?for=sowella&next=${encodeURIComponent(back)}`} className={className}>
          로그인하고 쏘웰라 시작하기
        </a>
      </>
    );
  }
  return (
    <a href={SOWELLA_CHAT_URL} className={className}>
      {label}
    </a>
  );
}
