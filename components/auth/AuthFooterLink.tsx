"use client";

// 모든 화면 하단(사업자 정보 바로 위)의 로그인/로그아웃 자리. 디저트 테스트 AuthFooterLink와 같은 방식:
// 같은 자리에서 상태에 맞게 글자와 동작만 바뀐다(로그아웃 상태 → '로그인', 로그인 상태 → '내 결과 · 로그아웃').
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserClient, isRealSession } from "@/lib/supabase/browser";
import { signOut } from "@/lib/supabase/authClient";

export default function AuthFooterLink() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) {
      queueMicrotask(() => setLoggedIn(false));
      return;
    }
    void supabase.auth.getSession().then(({ data }) => setLoggedIn(isRealSession(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setLoggedIn(isRealSession(s)));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  if (loggedIn === null) return null;

  return (
    <p className="mx-auto w-full max-w-md px-4 pt-6 text-center text-sm text-cream/80">
      {loggedIn ? (
        <>
          <Link href="/results" className="underline">내 결과</Link>
          {" · "}
          <button
            type="button"
            className="underline"
            onClick={() => void signOut().then(() => setToast("로그아웃했어요."))}
          >
            로그아웃
          </button>
        </>
      ) : (
        <Link href="/login" className="underline">로그인</Link>
      )}
      {toast && <span className="mt-1 block text-xs">{toast}</span>}
    </p>
  );
}
