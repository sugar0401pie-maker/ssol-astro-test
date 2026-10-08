"use client";

// 로그인 화면(마스터스펙 6-1 화면 6). 쏘웰라·디저트 테스트와 같은 계정이고, 그쪽에서 이미 로그인했다면
// 쿠키가 공유돼 이 화면은 건너뛴다. 회원가입은 쏘웰라 가입 화면을 새 탭으로 열고, 가입 후 이 탭으로 돌아오면
// 로그인 상태를 다시 확인한다(창으로 돌아올 때·로그인 상태가 바뀔 때 자동으로).
import { useEffect, useState } from "react";
import { getBrowserClient, getRealSession, isRealSession } from "@/lib/supabase/browser";
import { SIGNUP_URL, signInWithEmail, signInWithOAuth } from "@/lib/supabase/authClient";

const field = "w-full rounded-xl bg-cream px-3 py-3 text-base text-navy";

export default function AuthStep({ onSignedIn, beforeRedirect, title }: { onSignedIn: () => void; beforeRedirect?: () => void; title?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = !!getBrowserClient();

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (isRealSession(session)) onSignedIn();
    });
    // 다른 탭(쏘웰라 가입 화면)에서 로그인하고 돌아온 경우
    const recheck = () => {
      void getRealSession().then((s) => s && onSignedIn());
    };
    window.addEventListener("focus", recheck);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("focus", recheck);
    };
  }, [onSignedIn]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (!r.ok) setError(r.error ?? "로그인하지 못했어요.");
  }

  async function oauth(provider: "kakao" | "naver") {
    setError(null);
    beforeRedirect?.(); // 카카오·네이버 화면으로 갔다 돌아와도 진행 중인 테스트를 이어가게
    const r = await signInWithOAuth(provider);
    if (!r.ok) setError(r.error ?? "로그인하지 못했어요.");
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold leading-relaxed text-cream">{title ?? "결과를 저장하고 보려면 로그인해 주세요."}</h1>
      <p className="text-sm leading-relaxed text-cream/80">쏠 웰니스 하우스(쏘웰라·디저트 테스트)와 같은 계정으로 로그인할 수 있어요.</p>
      {!configured && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">설정 오류로 로그인을 사용할 수 없어요. 잠시 후 다시 시도해 주세요.</p>}

      <button className="w-full rounded-full bg-[#FEE500] px-6 py-3 font-bold text-[#191919] disabled:opacity-40" disabled={!configured} onClick={() => oauth("kakao")}>
        카카오로 로그인
      </button>
      <button className="w-full rounded-full bg-[#03C75A] px-6 py-3 font-bold text-white disabled:opacity-40" disabled={!configured} onClick={() => oauth("naver")}>
        네이버로 로그인
      </button>

      <form className="flex flex-col gap-2" onSubmit={submit}>
        <input className={field} type="email" autoComplete="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="이메일" />
        <input className={field} type="password" autoComplete="current-password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="비밀번호" />
        {error && <p className="text-sm text-cream">{error}</p>}
        <button type="submit" className="w-full rounded-full bg-gold px-6 py-3 font-bold text-navy disabled:opacity-40" disabled={busy || !configured}>
          {busy ? "로그인 중…" : "이메일로 로그인"}
        </button>
      </form>

      <p className="text-center text-sm text-cream/80">
        아직 계정이 없으신가요?{" "}
        <a className="underline" href={SIGNUP_URL} target="_blank" rel="noreferrer" onClick={() => beforeRedirect?.()}>
          쏠 웰니스 하우스에서 회원가입
        </a>
        <br />
        <span className="text-xs text-cream/60">가입을 마치고 이 화면으로 돌아오면 바로 이어집니다.</span>
      </p>
    </div>
  );
}
