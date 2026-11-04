"use client";

// 영문 로그인·회원가입 /en/login((나) 영문 전용, owner 2026-11-04: Google + 이메일 가입만 — 카카오·네이버·Apple 없음).
// 계정은 한국어판·쏘웰라와 같은 Supabase 계정(공유 auth.users·profiles)이라 가입 절차도 같은 함수(이메일 인증번호 → 비밀번호 →
// profiles 저장)를 쓴다. 가입 칸은 개발메모 §4: 이름(실명 아님)·이메일·비밀번호·생년월일(만 18세 이상) — 한국 가입 칸(휴대전화·
// 다음 우편번호 주소)은 없다. 한국어 로그인 화면(AuthStep)을 고쳐도 이 화면은 따라 바뀌지 않는다.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics/track";
import { safeNextPath } from "@/lib/auth/nextPath";
import { oauthErrorFromUrl } from "@/lib/auth/oauthError";
import { passwordChecks, isPasswordValid } from "@/lib/auth/password";
import { authErrorEn } from "@/lib/en/authText";
import { ageOn, EN_MIN_AGE } from "@/lib/en/birthForm";
import { enLegalUrl } from "@/lib/legal/en/blocks";
import { getRealSession } from "@/lib/supabase/browser";
import {
  checkEmailAvailable,
  confirmPasswordReset,
  finishSignup,
  requestPasswordReset,
  sendSignupOtp,
  signInWithEmail,
  signInWithOAuth,
  verifySignupOtp,
} from "@/lib/supabase/authClient";
import { setFlash } from "@/lib/ui/flash";

type Mode = "signin" | "signup" | "reset";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PwRules({ pw }: { pw: string }) {
  const c = passwordChecks(pw);
  return (
    <p className="hint" style={{ margin: "4px 0 0" }}>
      {c.length ? "✓" : "·"} 8+ characters &nbsp; {c.upper ? "✓" : "·"} an uppercase letter &nbsp; {c.special ? "✓" : "·"} a symbol
    </p>
  );
}

export default function LoginEn() {
  const router = useRouter();
  const params = useSearchParams();
  // 영문판 안에서만 돌아간다(없으면 영문 첫 화면)
  const rawNext = safeNextPath(params.get("next"), "/en");
  const next = rawNext.startsWith("/en") ? rawNext : "/en";
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const oauthReason = oauthErrorFromUrl({ search: `?${params.toString()}`, hash: "" });
  const [error, setError] = useState<string>(oauthReason ? `We couldn’t sign you in. Please try again or use another method. (${oauthReason})` : "");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // 가입
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [agree, setAgree] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");

  const goNext = useCallback(() => {
    track("login_done", { from: "en" });
    setFlash("You’re logged in.");
    router.replace(next);
  }, [router, next]);

  useEffect(() => {
    void getRealSession().then((s) => s && goNext());
  }, [goNext]);

  const fail = (ko?: string) => setError(authErrorEn(ko));

  async function signin() {
    setError("");
    if (!EMAIL_RE.test(email) || !password) return setError("Please enter your email and password.");
    setBusy(true);
    const r = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (!r.ok) return fail(r.error);
    goNext();
  }

  async function google() {
    setError("");
    const back = `${window.location.origin}/en/login?next=${encodeURIComponent(next)}`;
    const r = await signInWithOAuth("google", back);
    if (!r.ok) fail(r.error);
  }

  function signupErrors(): string {
    if (!name.trim()) return "Please tell us what to call you.";
    const [y, m, d] = dob.split("-").map(Number);
    if (!y || !m || !d) return "Please enter your date of birth.";
    if (ageOn({ year: y, month: m, day: d }, new Date()) < EN_MIN_AGE) return "SSOL Astro House is for people aged 18 and over.";
    if (!EMAIL_RE.test(email)) return "Please enter a valid email address.";
    if (!agree) return "Please confirm the required box to continue.";
    return "";
  }

  async function sendCode() {
    setError("");
    const e = signupErrors();
    if (e) return setError(e);
    setBusy(true);
    const { available } = await checkEmailAvailable(email.trim());
    if (!available) {
      setBusy(false);
      setMode("signin");
      return setError("This email already has an account. Log in, or reset your password if you forgot it.");
    }
    const r = await sendSignupOtp(email.trim(), { display_name: name.trim(), birth_date: dob });
    setBusy(false);
    if (!r.ok) return fail(r.error);
    setCodeSent(true);
    setNote("We sent a verification code to your email. It may take a minute to arrive.");
  }

  async function completeSignup() {
    setError("");
    const e = signupErrors();
    if (e) return setError(e);
    if (!code.trim()) return setError("Please enter the code from your email.");
    if (!isPasswordValid(password)) return setError("Please choose a password with 8+ characters, an uppercase letter and a symbol.");
    setBusy(true);
    const v = await verifySignupOtp(email.trim(), code.trim());
    if (!v.ok) {
      setBusy(false);
      return fail(v.error);
    }
    const f = await finishSignup({ password, displayName: name.trim(), birthDate: dob });
    setBusy(false);
    if (!f.ok) return fail(f.error);
    goNext();
  }

  async function sendReset() {
    setError("");
    if (!EMAIL_RE.test(email)) return setError("Please enter a valid email address.");
    setBusy(true);
    const r = await requestPasswordReset(email.trim());
    setBusy(false);
    if (!r.ok) return fail(r.error);
    setCodeSent(true);
    setNote("If this email has an account, we sent a reset code to it.");
  }

  async function doReset() {
    setError("");
    if (!code.trim()) return setError("Please enter the code from your email.");
    if (!isPasswordValid(password)) return setError("Please choose a password with 8+ characters, an uppercase letter and a symbol.");
    setBusy(true);
    const r = await confirmPasswordReset(email.trim(), code.trim(), password);
    setBusy(false);
    if (!r.ok) return fail(r.error);
    goNext();
  }

  const switchTo = (m: Mode) => {
    setMode(m);
    setError("");
    setNote("");
    setCodeSent(false);
    setCode("");
    setPassword("");
  };
  // 한국어 입력기 조합 중 Enter는 보내지 않는다(이 화면은 영문이지만 같은 규칙)
  const onEnter = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) fn();
  };

  return (
    <section className="screen on" lang="en" aria-labelledby="login-big">
      <h1 className="big" id="login-big" tabIndex={-1}>
        {mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : "Log in to keep your star report"}
      </h1>
      <p className="small">
        {mode === "signup"
          ? "One account works across SSOL Wellness House services."
          : mode === "reset"
            ? "We’ll email you a code to set a new password."
            : "Save your results to your account and come back anytime."}
      </p>

      {mode === "signin" && (
        <>
          <button type="button" className="btn block" onClick={() => void google()}>
            Continue with Google
          </button>
          <p className="hint text-center">or</p>
          <div className="field">
            <label htmlFor="en-email">Email</label>
            <input className="auth-input" id="en-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="en-pw" className="mt-2 block">Password</label>
            <input className="auth-input" id="en-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onEnter(() => void signin())} />
          </div>
          <p className="err" role="alert">{error}</p>
          <button type="button" className="btn block" disabled={busy} onClick={() => void signin()}>
            {busy ? "Logging in…" : "Log in"}
          </button>
          <div className="footer-ctrl">
            <button type="button" className="linkish" onClick={() => switchTo("signup")}>Create an account</button>
            <button type="button" className="linkish" onClick={() => switchTo("reset")}>Forgot password?</button>
          </div>
        </>
      )}

      {mode === "signup" && (
        <>
          <button type="button" className="btn block" onClick={() => void google()}>
            Sign up with Google
          </button>
          <p className="hint text-center">or with email</p>
          <div className="field">
            <label htmlFor="en-name">Name (doesn’t have to be your real name)</label>
            <input id="en-name" type="text" maxLength={30} autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} />
            <label htmlFor="en-dob" className="mt-2 block">Date of birth</label>
            <input className="auth-input" id="en-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            <label htmlFor="en-email" className="mt-2 block">Email</label>
            <input className="auth-input" id="en-email" type="email" autoComplete="email" value={email} disabled={codeSent} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <label className="check" htmlFor="en-agree">
            <input type="checkbox" id="en-agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              I am 18 years old or older, I agree to the{" "}
              <Link href={enLegalUrl("terms")} target="_blank" rel="noopener" className="underline">Terms of Use</Link>, and I have read the{" "}
              <Link href={enLegalUrl("privacy")} target="_blank" rel="noopener" className="underline">Privacy Policy</Link>.
            </span>
          </label>
          {codeSent && (
            <div className="field">
              <label htmlFor="en-code">Verification code</label>
              <input className="auth-input" id="en-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
              <label htmlFor="en-newpw" className="mt-2 block">Password</label>
              <input className="auth-input" id="en-newpw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onEnter(() => void completeSignup())} />
              <PwRules pw={password} />
            </div>
          )}
          {note && <p className="hint">{note}</p>}
          <p className="err" role="alert">{error}</p>
          {codeSent ? (
            <button type="button" className="btn block" disabled={busy} onClick={() => void completeSignup()}>
              {busy ? "Creating your account…" : "Create account"}
            </button>
          ) : (
            <button type="button" className="btn block" disabled={busy} onClick={() => void sendCode()}>
              {busy ? "Sending…" : "Send verification code"}
            </button>
          )}
          <div className="footer-ctrl">
            <button type="button" className="linkish" onClick={() => switchTo("signin")}>I already have an account</button>
          </div>
        </>
      )}

      {mode === "reset" && (
        <>
          <div className="field">
            <label htmlFor="en-email">Email</label>
            <input className="auth-input" id="en-email" type="email" autoComplete="email" value={email} disabled={codeSent} onChange={(e) => setEmail(e.target.value)} />
            {codeSent && (
              <>
                <label htmlFor="en-code" className="mt-2 block">Code</label>
                <input className="auth-input" id="en-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
                <label htmlFor="en-newpw" className="mt-2 block">New password</label>
                <input className="auth-input" id="en-newpw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <PwRules pw={password} />
              </>
            )}
          </div>
          {note && <p className="hint">{note}</p>}
          <p className="err" role="alert">{error}</p>
          <button type="button" className="btn block" disabled={busy} onClick={() => void (codeSent ? doReset() : sendReset())}>
            {busy ? "Please wait…" : codeSent ? "Set new password" : "Send reset code"}
          </button>
          <div className="footer-ctrl">
            <button type="button" className="linkish" onClick={() => switchTo("signin")}>Back to log in</button>
          </div>
        </>
      )}
    </section>
  );
}
