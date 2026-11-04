"use client";

// 모든 화면 하단(사업자 정보 바로 위)의 로그인/로그아웃 자리. 디저트 테스트 AuthFooterLink와 같은 방식:
// 같은 자리에서 상태에 맞게 글자와 동작만 바뀐다(로그아웃 상태 → '로그인', 로그인 상태 → '내 결과 · 로그아웃').
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserClient, isRealSession } from "@/lib/supabase/browser";
import { signOut } from "@/lib/supabase/authClient";
import LangLink from "@/components/i18n/LangLink";
import { enSiteEnabled, type Lang } from "@/lib/i18n/lang";

// 영문판(lang="en")은 같은 자리·같은 동작에 글자만 영어, 언어 링크는 반대 언어(owner 2026-11-04: 로그인 바로 옆).
const T = {
  ko: { results: "내 결과", resultsHref: "/results", logout: "로그아웃", loggedOut: "로그아웃했어요.", login: "로그인", loginHref: "/login" },
  en: { results: "My results", resultsHref: "/en/results", logout: "Log out", loggedOut: "You're logged out.", login: "Log in", loginHref: "/en/login" },
} as const;

export default function AuthFooterLink({ lang = "ko" }: { lang?: Lang }) {
  const t = T[lang];
  const other: Lang = lang === "ko" ? "en" : "ko";
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
    <p className="pt-2 text-center text-sm text-cream/80">
      {loggedIn ? (
        <>
          <Link href={t.resultsHref} className="underline">{t.results}</Link>
          {" · "}
          <button
            type="button"
            className="underline"
            onClick={() => void signOut().then(() => setToast(t.loggedOut))}
          >
            {t.logout}
          </button>
        </>
      ) : (
        <Link href={t.loginHref} className="underline">{t.login}</Link>
      )}
      <LangSep />
      <LangLink to={other} />
      {toast && <span className="mt-1 block text-xs">{toast}</span>}
    </p>
  );
}

/** 언어 링크 앞 구분점 — 영문판 스위치가 꺼져 있으면 링크도 점도 없다 */
function LangSep() {
  return enSiteEnabled() ? <>{" · "}</> : null;
}
