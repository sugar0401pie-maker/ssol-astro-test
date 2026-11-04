"use client";

// 영문 질문 화면 /en/questions(영문판 2026-11-04, 화면 구성은 한국어 질문 화면과 같은 (가) — 글자만 영어).
// /en/start에서 넘긴 진행 상태(이 탭 sessionStorage)를 읽어 세 질문 → 계산 중 → (유형 후보가 갈리면 고르기) → 저장 → /en/results/{id}/1.
// 계산·저장은 한국어판과 같은 API(/api/result, /api/results)에 lang: "en"을 붙여 보낸다 — 서버가 영문 DB로 결과를 만든다.
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import GuideArt from "@/components/test/GuideArt";
import SiteFooterEn from "@/components/SiteFooterEn";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import { track } from "@/lib/analytics/track";
import { apiHeaders } from "@/lib/guest/client";
import { getAttribution } from "@/lib/attribution/client";
import { getRealSession } from "@/lib/supabase/browser";
import { EN as L } from "@/lib/report/lang";
import { EN_QUESTIONS_BIG, EN_QUESTIONS_ERR, EN_QUESTION_LIST, completeAnswers } from "@/lib/en/questions";
import type { Answers } from "@/lib/astro/answers";
import { EN_PROGRESS_KEY } from "./BirthStartEn";

type Progress = { nickname: string; birth: Record<string, unknown>; cityLabel?: string };
type Candidate = { competency: string; style: string; pick?: string; card?: string };
type Step = "questions" | "loading" | "candidates" | "error" | "limited";

const noop = () => () => {};
const rawProgress = () => {
  try {
    return sessionStorage.getItem(EN_PROGRESS_KEY);
  } catch {
    return null;
  }
};

function parseProgress(raw: string | null): Progress | null {
  try {
    const p = JSON.parse(raw ?? "null");
    return p && typeof p.nickname === "string" && p.birth ? (p as Progress) : null;
  } catch {
    return null;
  }
}

export default function QuestionsEn() {
  const router = useRouter();
  // 서버에서 그릴 때는 undefined(아직 모름), 브라우저에서는 이 탭에 담긴 진행 상태
  const raw = useSyncExternalStore(noop, rawProgress, () => undefined);
  const progress = useMemo(() => (raw === undefined ? undefined : parseProgress(raw)), [raw]);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [err, setErr] = useState("");
  const [step, setStep] = useState<Step>("questions");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [grade, setGrade] = useState("B");

  // 출생 정보 없이 이 주소로 바로 들어오면 출생 정보 화면으로
  useEffect(() => {
    if (progress === null) router.replace("/en/start");
  }, [progress, router]);

  if (!progress) return <div className="flex-1" />;

  const body = (a: Answers, pick?: string, typePick?: { competency: string; style: string }) => ({
    birth: { ...progress.birth, time: pick ? { ...(progress.birth.time as object), pick } : progress.birth.time, ...(typePick ? { typePick } : {}) },
    answers: a,
    nickname: progress.nickname,
    lang: "en",
  });

  async function run(a: Answers, pick?: string, typePick?: { competency: string; style: string }) {
    setStep("loading");
    const t0 = Date.now();
    const wait = () => new Promise((r) => setTimeout(r, Math.max(0, 1500 - (Date.now() - t0))));
    try {
      const check = await fetch("/api/result", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body(a, pick, typePick)) });
      const cd = await check.json();
      if (check.status === 400) {
        await wait();
        router.replace("/en/start");
        return;
      }
      if (!check.ok) throw new Error("calc");
      if (cd.candidates) {
        await wait();
        setCandidates(cd.candidates);
        setGrade(cd.accuracy ?? "B");
        setStep("candidates");
        return;
      }
      const session = await getRealSession();
      const res = await fetch("/api/results", {
        method: "POST",
        headers: apiHeaders(session, { "content-type": "application/json" }),
        body: JSON.stringify({ ...body(a, pick, typePick), consent: true, firstTime: false, attribution: getAttribution() }),
      });
      const data = await res.json();
      await wait();
      if (res.status === 429) return setStep("limited");
      if (!res.ok || !data.id) throw new Error("save");
      try {
        sessionStorage.removeItem(EN_PROGRESS_KEY);
      } catch {
        /* 무시 */
      }
      router.replace(`/en/results/${data.id}/1`);
    } catch {
      await wait();
      track("calc_fail");
      setStep("error");
    }
  }

  function submit() {
    if (!completeAnswers(answers)) {
      setErr(EN_QUESTIONS_ERR);
      return;
    }
    setErr("");
    track("questions_done", { from: "en" });
    void run(answers);
  }

  return (
    <div lang="en" className="flex flex-1 flex-col">
      {step === "questions" && (
        <section className="screen on" id="scr-q" aria-labelledby="q-big">
          <h1 className="big" id="q-big" tabIndex={-1}>
            {EN_QUESTIONS_BIG(progress.nickname)}
          </h1>
          <GuideArt id="05" small />
          {EN_QUESTION_LIST.map((q) => (
            <fieldset key={q.key} className="field q-block" id={`fs-${q.key}`}>
              <legend className="lbl">
                <span className="q-num">{q.tag}</span>
                {q.label}
              </legend>
              <div className="chips">
                {q.options.map(([value, label], i) => (
                  <label key={value} className="chip" htmlFor={`${q.key}-${i}`}>
                    <input type="radio" name={q.key} id={`${q.key}-${i}`} value={value} checked={answers[q.key] === value} onChange={() => setAnswers((x) => ({ ...x, [q.key]: value }))} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <p className="err" role="alert">{err}</p>
          <button className="btn block" type="button" onClick={submit}>
            See my results
          </button>
          <div className="footer-ctrl">
            <button type="button" className="linkish" onClick={() => router.push("/en/start")}>
              ← Back
            </button>
          </div>
        </section>
      )}

      {step === "loading" && (
        <section className="screen on" aria-live="polite" aria-labelledby="loading-title">
          <div className="loading">
            <div className="orbit" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(203,178,122,.35)" strokeWidth="1" />
                <circle cx="60" cy="60" r="26" fill="none" stroke="rgba(253,246,233,.2)" strokeWidth="1" />
                <circle cx="60" cy="60" r="9" fill="#013566" stroke="#CBB27A" />
                <g className="spin">
                  <circle cx="104" cy="60" r="5" fill="#CBB27A" />
                  <circle cx="60" cy="34" r="3" fill="#FDF6E9" />
                </g>
              </svg>
            </div>
            {/* 번역 묶음 A15 FIX_LOADING 영문 대신 짧은 안내(Claude 초안) */}
            <p className="big" id="loading-title">Reading your stars…</p>
          </div>
        </section>
      )}

      {step === "candidates" && (
        <section className="screen on" aria-labelledby="cand-big">
          <h1 className="big" id="cand-big" tabIndex={-1}>
            Which type feels more like you?
          </h1>
          <p className="small">
            {grade === "C"
              ? "We don’t know your birth time, so we checked every 30 minutes across the whole day, and more than one type came up. Choose the one that feels most like you these days."
              : "We checked your time range in 30-minute steps, and more than one type came up. Choose the one that feels most like you these days."}
          </p>
          <GuideArt id="07" />
          <div className="choice night">
            {candidates.map((c) => (
              <button key={`${c.competency}-${c.style}`} type="button" aria-pressed="false" onClick={() => completeAnswers(answers) && void run(answers, c.pick, { competency: c.competency, style: c.style })}>
                <b>
                  {L.competency(c.competency)} × {L.style(c.style)}
                </b>
                {c.card ?? ""}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "error" && (
        <section className="screen on">
          <h1 className="big">The stars blinked for a moment</h1>
          <p className="small">Your answers are still here. Please try again in a moment.</p>
          <button className="btn block" type="button" onClick={() => completeAnswers(answers) && void run(answers)}>
            Try again
          </button>
        </section>
      )}

      {step === "limited" && (
        <section className="screen on">
          <h1 className="big">That’s all for today</h1>
          <p className="small">You can save up to 3 results a day. Please come back tomorrow.</p>
          <button className="btn block" type="button" onClick={() => router.push("/en/results")}>
            See my results
          </button>
        </section>
      )}

      <AuthFooterLink lang="en" />
      <SiteFooterEn />
    </div>
  );
}
