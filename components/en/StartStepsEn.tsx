"use client";

// 영문 테스트 앞 단계 3개 — 한국어 TestFlow의 환영(이름)·점성술 경험·처음 안내와 같은 순서·같은 안내 그림(02·03·03-1).
// 문구는 번역 묶음 DATA04 onboarding_copy 2_welcome·3_experience·3_1_first_time 그대로. 화면마다 주소가 따로 있다.
// 이 화면들은 영문 출생 정보 화면과 함께 (나)로 관리 — 한국어 화면을 고쳐도 따라 바뀌지 않는다.
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import GuideArt from "@/components/test/GuideArt";
import SiteFooterEn from "@/components/SiteFooterEn";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import { track } from "@/lib/analytics/track";
import { cleanNicknameEn } from "@/lib/en/birthForm";
import { parseEnProgress, saveEnProgress, useEnProgressRaw } from "./useEnProgress";

function Footer({ back }: { back?: string }) {
  const router = useRouter();
  return (
    <>
      <div className="footer-ctrl">
        {back ? (
          <button type="button" className="linkish" onClick={() => router.push(back)}>
            ← Back
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="linkish" onClick={() => router.push("/en")}>
          Start over
        </button>
      </div>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div lang="en" className="flex flex-1 flex-col">
      {children}
      <div className="intro-foot">
        <AuthFooterLink lang="en" />
        <SiteFooterEn />
      </div>
    </div>
  );
}

/** 앞 단계의 이름이 없으면 /en/start로 */
function useNickname(): string | null | undefined {
  const router = useRouter();
  const raw = useEnProgressRaw();
  const nick = useMemo(() => (raw === undefined ? undefined : (parseEnProgress(raw)?.nickname ?? null)), [raw]);
  useEffect(() => {
    if (nick === null) router.replace("/en/start");
  }, [nick, router]);
  return nick;
}

export function WelcomeEn() {
  const router = useRouter();
  const raw = useEnProgressRaw();
  const saved = useMemo(() => (raw ? (parseEnProgress(raw)?.nickname ?? "") : ""), [raw]);
  const [typed, setTyped] = useState<string | null>(null);
  const nickname = typed ?? saved;
  const [err, setErr] = useState("");
  useEffect(() => {
    track("start", { from: "en" }, "test:start:en");
  }, []);
  function submit() {
    const n = cleanNicknameEn(nickname);
    if (!n) return setErr("Please enter a nickname.");
    saveEnProgress({ nickname: n });
    track("nickname_done", { from: "en" });
    router.push("/en/start/experience");
  }
  return (
    <Shell>
      <section className="screen on" id="scr-welcome" aria-labelledby="welcome-big">
        <p className="eyebrow">Welcome</p>
        <h1 className="big" id="welcome-big" tabIndex={-1}>
          Welcome to SSOL Astro House.
        </h1>
        <p className="small">What should we call you?</p>
        <GuideArt id="02" />
        <label className="lbl sr-only" htmlFor="en-nickname">
          Nickname
        </label>
        <input
          type="text"
          id="en-nickname"
          maxLength={12}
          autoComplete="nickname"
          placeholder="Nickname (up to 12 characters)"
          value={nickname}
          onChange={(e) => {
            setTyped(e.target.value);
            setErr("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
          }}
        />
        <p className="err" role="alert">{err}</p>
        <div className="stack">
          <button className="btn block" type="button" onClick={submit}>
            Use this name
          </button>
        </div>
        <Footer />
      </section>
    </Shell>
  );
}

export function ExperienceEn() {
  const router = useRouter();
  const nick = useNickname();
  if (!nick) return <div className="flex-1" />;
  const go = (first: boolean) => {
    saveEnProgress({ firstTime: first });
    router.push(first ? "/en/start/first-time" : "/en/start/birth");
  };
  return (
    <Shell>
      <section className="screen on" id="scr-exp" aria-labelledby="exp-big">
        <h1 className="big" id="exp-big" tabIndex={-1}>
          {nick}, what brings you here today? But first — is this your first time trying astrology?
        </h1>
        <GuideArt id="03" />
        <div className="stack">
          <button className="btn block ghost" type="button" onClick={() => go(false)}>
            I’ve tried it before
          </button>
          <button className="btn block" type="button" onClick={() => go(true)}>
            Yes, it’s my first time
          </button>
        </div>
        <Footer back="/en/start" />
      </section>
    </Shell>
  );
}

export function FirstTimeEn() {
  const router = useRouter();
  const nick = useNickname();
  if (!nick) return <div className="flex-1" />;
  return (
    <Shell>
      <section className="screen on" id="scr-first" aria-labelledby="first-big">
        <h1 className="big" id="first-big" tabIndex={-1}>
          {nick}, today we read your past, present and future through astrology, using your birth date and time. Then our signature SSOL House recipe turns it into wellness suggestions for your main concern. Ready to begin?
        </h1>
        <GuideArt id="03-1" />
        <div className="stack">
          <button className="btn block" type="button" onClick={() => router.push("/en/start/birth")}>
            Yes, let&apos;s go!
          </button>
        </div>
        <Footer back="/en/start/experience" />
      </section>
    </Shell>
  );
}
