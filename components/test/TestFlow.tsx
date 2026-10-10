"use client";

// 화면 2~8(마스터스펙 6-1) — 2026-10-09 프로토타입(docs/spec/13_프로토타입/index.html)의 마크업·문구·검증을 그대로 옮겼다
// (owner 2026-10-10 "html과 완전히 동일하게"). 환영·닉네임 → 경험 확인(→ 처음 안내) → 생년월일·시간·출생지 + 필수 동의 →
// 질문 3개(한 화면) → 계산 중(최소 1.5초) → (후보가 갈리면) 유형 후보 선택 → 저장(로그인했으면 계정, 아니면 비회원 익명) → 결과.
// 화면마다 주소가 있어(owner 2026-10-09) 휴대폰 뒤로 가기가 되고, 프로토타입 하단 줄의 빈 왼쪽 자리에 '← 이전'을 둔다.
import { useEffect, useRef, useState } from "react";
import { Q1_OPTIONS, Q2_OPTIONS, Q3_OPTIONS, type Answers } from "@/lib/astro/answers";
import { isPage, pathOf, prevStep, restorableStep, stepFromPath, type Progress, type Step } from "./steps";
import { KOREA_REGIONS } from "@/lib/astro/places";
import type { FreeResult } from "@/lib/report/freeResult";
import { getRealSession } from "@/lib/supabase/browser";
import { apiHeaders } from "@/lib/guest/client";
import CitySearch, { type PickedCity } from "./CitySearch";
import ConsentStep from "./ConsentStep";
import { allConsented, CONSENT_ERROR, consentItemsFor, type ConsentItemId } from "@/lib/results/consent";
import FreeResultView from "./FreeResultView";
import SiteFooter from "@/components/SiteFooter";

// 새로고침해도 이 탭 안에서는 이어 가도록 진행 상태를 sessionStorage에 둔다(탭을 닫으면 사라짐, 결과 저장 뒤엔 결과 id만).
const PROGRESS_KEY = "astro_test_progress_v2";
interface SavedProgress {
  nickname: string;
  firstTime: boolean | null;
  year: number | null;
  month: number | null;
  day: number | null;
  hour: number | null;
  minute: number | null;
  unknownTime: boolean;
  band: BandId | null;
  region: string | null;
  overseas: boolean;
  city: PickedCity | null;
  answers: Partial<Answers>;
  pick: string | null;
  consents?: Partial<Record<ConsentItemId, boolean>>;
  savedId?: string | null;
}
function loadProgress(): SavedProgress | null {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as SavedProgress) : null;
  } catch {
    return null;
  }
}
function storeProgress(p: SavedProgress | { savedId: string } | null) {
  try {
    if (p) sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    else sessionStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* 저장소를 못 쓰는 환경 — 새로고침하면 처음부터 */
  }
}

/** 첫 화면: 주소의 화면(앞 답이 없으면 답이 있는 화면까지) */
function initialStep(progress: SavedProgress | null): Step {
  const requested = stepFromPath(window.location.pathname) ?? "welcome";
  if (requested === "welcome" || !progress?.nickname) return "welcome";
  const p: Progress = {
    nickname: progress.nickname,
    firstTime: progress.firstTime,
    // 새로고침 복원용: 로그인 여부를 아직 모르므로 공통 두 가지만 본다(임시 계정 동의는 생년월일 화면에서 이미 받았다)
    consented: allConsented(progress.consents ?? {}, false),
    answers: progress.answers as Progress["answers"],
  };
  return restorableStep(requested, p);
}

// 시간대 칩(04_데이터.json time_bands — 클라이언트 번들에 계산 엔진이 딸려 오지 않도록 여기 따로 둔다, lib/astro/birth.ts TIME_BANDS와 같은 키)
const BANDS = [
  { id: "dawn", label: "새벽", range: "00–06시" },
  { id: "morning", label: "오전", range: "06–12시" },
  { id: "afternoon", label: "오후", range: "12–18시" },
  { id: "evening", label: "저녁", range: "18–24시" },
  { id: "unknown", label: "태어난 시간을 잘 모르겠어요", range: "" },
] as const;
type BandId = (typeof BANDS)[number]["id"];

interface Candidate {
  /** B6 후보 선택 카드 문장(해석 DB) */
  card?: string;
  label: string;
  competency: string;
  style: string;
  share: number;
  pick: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** 한국 날짜 'YYYY-MM-DD'(미래 날짜 막기용) */
const todayKst = () => new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const numOrNull = (v: string) => (v === "" ? null : Number(v));

// 질문(04_데이터.json questions, 프로토타입 initQ): Q1 라벨은 '주요 고민 — 요즘 제일 신경 쓰이는 부분'
const QUESTIONS = [
  { key: "q1", tag: "Q1", label: "주요 고민 — 요즘 제일 신경 쓰이는 부분", options: Q1_OPTIONS },
  { key: "q2", tag: "Q2", label: "당신에게 2026년을 한 단어로 정의하면?", options: Q2_OPTIONS },
  { key: "q3", tag: "Q3", label: "2027년에 희망하는 것은?", options: Q3_OPTIONS },
] as const;

/** 칸 아래 오류 줄(프로토타입 .err — 비어 있으면 숨김) */
function Err({ msg, id }: { msg?: string; id?: string }) {
  return (
    <p className="err" id={id} role="alert">
      {msg ?? ""}
    </p>
  );
}

export default function TestFlow() {
  // 이 컴포넌트는 브라우저에서만 그린다(app/test/TestClient.tsx) — 그래서 첫 상태를 sessionStorage에서 바로 읽어도 된다.
  const [restored] = useState(loadProgress);
  const [step, setStepState] = useState<Step>(() => initialStep(restored));
  const [nickname, setNickname] = useState(restored?.nickname ?? "");
  // 경험 응답: '처음'이면 결과에서 태양·달·상승궁 용어에 한 줄 설명을 붙인다(6-1 기타).
  const [firstTime, setFirstTime] = useState<boolean | null>(restored?.firstTime ?? null);
  // 프로토타입처럼 모든 선택칸은 비어 있는 채로 시작한다(연도·월·일·시·분·시도) — 기본값을 모르고 넘기지 않게.
  const [year, setYear] = useState<number | null>(restored?.year ?? null);
  const [month, setMonth] = useState<number | null>(restored?.month ?? null);
  const [day, setDay] = useState<number | null>(restored?.day ?? null);
  const [hour, setHour] = useState<number | null>(restored?.hour ?? null);
  const [minute, setMinute] = useState<number | null>(restored?.minute ?? null);
  const [unknownTime, setUnknownTime] = useState(restored?.unknownTime ?? false);
  const [band, setBand] = useState<BandId | null>(restored?.band ?? null);
  const [region, setRegion] = useState<string | null>(restored?.region ?? null);
  const [overseas, setOverseas] = useState(restored?.overseas ?? false);
  const [city, setCity] = useState<PickedCity | null>(restored?.city ?? null);
  const [answers, setAnswers] = useState<Partial<Answers>>(restored?.answers ?? {});
  const [consents, setConsents] = useState<Partial<Record<ConsentItemId, boolean>>>(restored?.consents ?? {});
  // 로그인하지 않은(익명·비회원) 사람에게만 '임시 계정 생성 및 결과 저장' 동의를 보인다(owner 2026-10-10). 확인 전엔 보이는 쪽(fail safe).
  const [guest, setGuest] = useState(true);
  useEffect(() => {
    void getRealSession().then((s) => setGuest(!s));
  }, []);
  const consentItems = consentItemsFor(guest);
  const consented = allConsented(consents, guest);
  const someConsent = consentItems.some((c) => consents[c.id]);
  // 칸별 오류(프로토타입 .err)
  const [errs, setErrs] = useState<{ nick?: string; date?: string; time?: string; place?: string; agree?: string; q?: string }>({});
  // 유형 후보를 고른 경우 그 대표 시각 — 저장 요청에도 그대로 보낸다.
  const [pick, setPick] = useState<string | null>(restored?.pick ?? null);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateGrade, setCandidateGrade] = useState<string>("B");
  // 결과 전 화면의 고정 문구(해석 DB A15). 못 받아 와도 화면은 그대로 진행한다.
  const [copy, setCopy] = useState<{ FIX_LOADING?: string; FIX_PRIVACY_NOTE?: string }>({});
  useEffect(() => {
    fetch("/api/copy")
      .then((r) => (r.ok ? r.json() : {}))
      .then(setCopy)
      .catch(() => {});
  }, []);
  const [result, setResult] = useState<FreeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const agreeRef = useRef<HTMLFieldSetElement>(null);
  const allRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // '모두 동의'의 일부 체크 표시(프로토타입 indeterminate)
    if (allRef.current) allRef.current.indeterminate = !consented && someConsent;
  }, [consented, someConsent, step]);

  // ---- 화면 주소와 뒤로 가기 ----
  const trail = useRef<{ stack: Step[]; pos: number }>({ stack: [step], pos: 0 });
  useEffect(() => {
    if (isPage(step) && window.location.pathname !== pathOf(step)) window.history.replaceState(null, "", pathOf(step));
    const asked = stepFromPath(window.location.pathname);
    if (restored?.savedId && (asked === "result" || asked === "candidates")) window.location.replace(`/results/${restored.savedId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function setStep(next: Step) {
    setStepState(next);
    window.scrollTo(0, 0);
    if (!isPage(next)) return; // 계산 중·저장 재시도는 주소를 바꾸지 않는다
    const t = trail.current;
    if (t.stack[t.pos] === next) return;
    t.stack = [...t.stack.slice(0, t.pos + 1), next];
    t.pos++;
    window.history.pushState(null, "", pathOf(next));
  }
  useEffect(() => {
    const onPop = () => {
      const target = stepFromPath(window.location.pathname);
      if (!target) return;
      const t = trail.current;
      if (t.stack[t.pos - 1] === target) t.pos--;
      else if (t.stack[t.pos + 1] === target) t.pos++;
      const drawable = (target === "candidates" && candidates.length === 0) || (target === "result" && !result) ? "questions" : target;
      setStepState(drawable);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [candidates.length, result]);
  function goBack() {
    const prev = prevStep(step, firstTime);
    if (!prev) return;
    if (trail.current.pos > 0 && trail.current.stack[trail.current.pos - 1] === prev) window.history.back();
    else {
      setStepState(prev);
      window.history.replaceState(null, "", pathOf(prev));
      trail.current = { stack: [prev], pos: 0 };
    }
  }
  /** 처음부터 다시(프로토타입 restart): 입력을 모두 지우고 닉네임 화면으로 */
  function restart() {
    storeProgress(null);
    // 모든 입력을 확실히 비우려고 화면을 새로 연다(프로토타입 restart와 같은 결과)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/test");
  }

  const name = nickname.trim();
  const maxDay = daysInMonth(year ?? 2000, month ?? 1);

  // 진행 상태를 이 탭에 담아 둔다(새로고침해도 이어 가기). 결과를 저장한 뒤에는 결과 id만.
  useEffect(() => {
    if (savedId) storeProgress({ savedId });
    else if (step !== "result") storeProgress({ nickname, firstTime, year, month, day, hour, minute, unknownTime, band, region, overseas, city, answers, pick, consents });
  }, [savedId, step, nickname, firstTime, year, month, day, hour, minute, unknownTime, band, region, overseas, city, answers, pick, consents]);

  const birthTime = () => {
    if (!unknownTime) return { kind: "exact", hour: hour ?? 0, minute: minute ?? 0 } as const;
    if (band === "unknown" || !band) return { kind: "unknown" } as const;
    return { kind: "band", band } as const;
  };

  const requestBody = (a: Answers, p: string | null) => ({
    birth: {
      year,
      month,
      day,
      time: p ? { ...birthTime(), pick: p } : birthTime(),
      place: overseas && city ? { cityId: city.id } : { region },
    },
    answers: a,
    nickname: name,
  });

  async function saveAndShow() {
    setSaving(true);
    setError(null);
    try {
      // 로그인했으면 계정에, 아니면 이 브라우저의 비회원 열쇠로 익명 저장한다.
      const session = await getRealSession();
      const res = await fetch("/api/results", {
        method: "POST",
        headers: apiHeaders(session, { "content-type": "application/json" }),
        body: JSON.stringify({ ...requestBody(answers as Answers, pick), consent: true, firstTime: firstTime === true }),
      });
      const data = await res.json();
      if (!res.ok || !data.result) throw new Error(data.error ?? "저장하지 못했어요.");
      setResult(data.result);
      setSavedId(data.id ?? null);
      setSaveNote(data.saveError ? "결과를 저장하지 못했어요. 이 화면을 닫으면 다시 볼 수 없어요." : null);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
      setStep("consent");
    } finally {
      setSaving(false);
    }
  }

  // 차트 미리 계산(6-1 화면 5 '차트 계산은 이 동안 백그라운드에서'): 출생 정보 화면을 넘기는 순간 시작해 두고,
  // 질문을 마치면 그 답을 쓴다. 후보 판정은 출생 정보로만 정해져서 임시 답으로 미리 물어도 결과가 같다.
  const prefetch = useRef<{ key: string; promise: Promise<{ ok: boolean; data: Record<string, unknown> }> } | null>(null);
  const tempAnswers = { q1: Q1_OPTIONS[0], q2: Q2_OPTIONS[0], q3: Q3_OPTIONS[0] } as Answers;
  const birthKey = () => JSON.stringify(requestBody(tempAnswers, null).birth);
  const postResult = (body: unknown) =>
    fetch("/api/result", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (res) => ({
      ok: res.ok,
      data: (await res.json()) as Record<string, unknown>,
    }));
  function startPrefetch() {
    const key = birthKey();
    if (prefetch.current?.key === key) return;
    const promise = postResult(requestBody(tempAnswers, null));
    promise.catch(() => {}); // 실패하면 질문을 마친 뒤 다시 묻는다
    prefetch.current = { key, promise };
  }

  /** 계산 중 화면(프로토타입 runLoading): 최소 1.5초, 실패하면 출생 정보 화면으로 돌아가 안내 */
  async function fetchResult(a: Answers, chosen?: string) {
    setStep("loading");
    setError(null);
    const t0 = Date.now();
    const wait = () => new Promise((r) => setTimeout(r, Math.max(0, 1500 - (Date.now() - t0))));
    try {
      const cached = !chosen && prefetch.current?.key === birthKey() ? await prefetch.current.promise.catch(() => null) : null;
      const { ok, data } = cached?.ok ? cached : await postResult(requestBody(a, chosen ?? null));
      if (!ok) throw new Error((data.error as string) ?? "계산 중 문제가 생겼어요.");
      if (data.candidates) {
        await wait();
        setCandidates(data.candidates as Candidate[]);
        setCandidateGrade((data.accuracy as string) ?? "B");
        setStep("candidates");
        return;
      }
      setPick(chosen ?? null);
      await wait();
      await saveAndShow();
    } catch {
      await wait();
      setStep("birth");
      setErrs({ place: "계산 중 문제가 생겼어요. 입력을 확인해 주세요." });
    }
  }

  function submitNick() {
    if (!name) {
      setErrs({ nick: "불러드릴 이름을 한 글자 이상 적어 주세요." });
      return;
    }
    setErrs({});
    setStep("experience");
  }

  function submitBirth() {
    if (!consented) {
      setErrs({ agree: CONSENT_ERROR });
      agreeRef.current?.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
      return;
    }
    const e: typeof errs = {};
    if (!year || !month || !day) e.date = "연도·월·일을 모두 골라 주세요.";
    else if (`${year}-${pad(month)}-${pad(day)}` > todayKst()) e.date = "오늘 이후의 날짜는 고를 수 없어요.";
    if (!unknownTime && (hour === null || minute === null)) e.time = "태어난 시와 분을 골라 주세요. 모르면 ‘정확한 시간을 몰라요’를 눌러 주세요.";
    if (unknownTime && !band) e.time = "가장 가까운 시간대를 하나 골라 주세요.";
    if (!overseas && !region) e.place = "태어난 시·도를 골라 주세요.";
    if (overseas && !city) e.place = "도시를 검색해 목록에서 골라 주세요.";
    setErrs(e);
    if (Object.keys(e).length) {
      setTimeout(() => document.querySelector("#scr-birth .err")?.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" }), 0);
      return;
    }
    startPrefetch();
    setStep("questions");
  }

  function submitQuestions() {
    if (!answers.q1 || !answers.q2 || !answers.q3) {
      setErrs({ q: "세 가지 질문에 하나씩 골라 주세요." });
      return;
    }
    setErrs({});
    void fetchResult(answers as Answers);
  }

  // 화면 아래 줄(프로토타입 .footer-ctrl): 왼쪽 '← 이전'(owner 2026-10-09 뒤로 가기), 오른쪽 '처음부터 다시'
  const footerCtrl = (
    <div className="footer-ctrl">
      {prevStep(step, firstTime) ? (
        <button type="button" className="linkish" onClick={goBack}>
          ← 이전
        </button>
      ) : (
        <span />
      )}
      <button type="button" className="linkish" onClick={restart}>
        처음부터 다시
      </button>
    </div>
  );

  return (
    <main className="flex w-full flex-1 flex-col">
      {step === "welcome" && (
        <section className="screen on" id="scr-welcome" aria-labelledby="welcome-big">
          <p className="eyebrow">Welcome</p>
          <h1 className="big" id="welcome-big">쏠 아스트로 하우스에 오신 당신을 환영합니다.</h1>
          <p className="small">당신을 뭐라고 불러드리면 될까요?</p>
          <label className="lbl sr-only" htmlFor="nickname">
            닉네임
          </label>
          <input
            type="text"
            id="nickname"
            maxLength={12}
            autoComplete="nickname"
            placeholder="닉네임 (최대 12자)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => {
              // 한글 조합 중 Enter는 전송으로 처리하지 않는다.
              if (e.key === "Enter" && !e.nativeEvent.isComposing) submitNick();
            }}
          />
          <Err msg={errs.nick} />
          <div className="stack">
            <button className="btn block" type="button" onClick={submitNick}>
              이렇게 불러주세요
            </button>
          </div>
          {footerCtrl}
        </section>
      )}

      {step === "experience" && (
        <section className="screen on" id="scr-exp" aria-labelledby="exp-big">
          <h1 className="big" id="exp-big">
            {name}님, 오늘은 어떤 고민을 가져오셨나요? 그보다, 점성술은 오늘이 처음이신지요?
          </h1>
          <div className="stack">
            <button className="btn block ghost" type="button" onClick={() => { setFirstTime(false); setStep("birth"); }}>
              전에 본 적이 있어요
            </button>
            <button className="btn block" type="button" onClick={() => { setFirstTime(true); setStep("firstTime"); }}>
              네, 처음이에요
            </button>
          </div>
          {footerCtrl}
        </section>
      )}

      {step === "firstTime" && (
        <section className="screen on" id="scr-first" aria-labelledby="first-big">
          <h1 className="big" id="first-big">
            오늘 당신의 태어난 날짜와 시간을 토대로 점성술에 따라 {name}님의 과거와 현재, 미래를 알아봅니다. 우리 쏠 하우스만의 특제 레시피로 {name}님의 주요
            고민에 맞는 웰니스 제안을 해드릴게요. 이제 한 번 해볼까요?
          </h1>
          <div className="stack">
            <button className="btn block" type="button" onClick={() => setStep("birth")}>
              네, 좋아요!
            </button>
          </div>
          {footerCtrl}
        </section>
      )}

      {step === "birth" && (
        <section className="screen on" id="scr-birth" aria-labelledby="birth-big">
          <h1 className="big" id="birth-big">
            좋습니다. 먼저 {name}님의 생년월일과 태어난 시간, 태어난 곳을 알려주세요.
          </h1>
          <fieldset className="field" id="fs-date">
            <legend>생년월일 (양력)</legend>
            <div className="row3">
              <div>
                <label className="sr-only" htmlFor="birth-year">태어난 해</label>
                <select id="birth-year" value={year ?? ""} onChange={(e) => setYear(numOrNull(e.target.value))}>
                  <option value="">연도</option>
                  {Array.from({ length: 2026 - 1900 + 1 }, (_, i) => 2026 - i).map((y) => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="sr-only" htmlFor="birth-month">태어난 달</label>
                <select
                  id="birth-month"
                  value={month ?? ""}
                  onChange={(e) => {
                    const m = numOrNull(e.target.value);
                    setMonth(m);
                    if (day && day > daysInMonth(year ?? 2000, m ?? 1)) setDay(null);
                  }}
                >
                  <option value="">월</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}월</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="sr-only" htmlFor="birth-day">태어난 날</label>
                <select id="birth-day" value={day && day <= maxDay ? day : ""} onChange={(e) => setDay(numOrNull(e.target.value))}>
                  <option value="">일</option>
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}일</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="date-preview" aria-live="polite">
              {year && month && day && day <= maxDay ? `${year}-${pad(month)}-${pad(day)}` : ""}
            </p>
            <p className="hint">실제로 태어난 날짜 기준(자정 이후 출생이면 다음 날)</p>
            <Err msg={errs.date} />
          </fieldset>

          <fieldset className="field" id="fs-time">
            <legend>태어난 시간</legend>
            {!unknownTime && (
              <div className="row2">
                <div>
                  <label className="sr-only" htmlFor="birth-hour">시</label>
                  <select id="birth-hour" value={hour ?? ""} onChange={(e) => setHour(numOrNull(e.target.value))}>
                    <option value="">시</option>
                    {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                      <option key={h} value={h}>{pad(h)}시</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="sr-only" htmlFor="birth-minute">분</label>
                  <select id="birth-minute" value={minute ?? ""} onChange={(e) => setMinute(numOrNull(e.target.value))}>
                    <option value="">분</option>
                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                      <option key={m} value={m}>{pad(m)}분</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <label className="check" htmlFor="time-unknown">
              <input
                type="checkbox"
                id="time-unknown"
                checked={unknownTime}
                onChange={(e) => {
                  setUnknownTime(e.target.checked);
                  setErrs((x) => ({ ...x, time: undefined }));
                }}
              />
              정확한 시간을 몰라요
            </label>
            {unknownTime && (
              <div className="chips" role="radiogroup" aria-label="태어난 시간대">
                {BANDS.map((b) => (
                  <label key={b.id} className="chip" htmlFor={`band-${b.id}`}>
                    <input type="radio" name="band" id={`band-${b.id}`} value={b.id} checked={band === b.id} onChange={() => setBand(b.id)} />
                    <span>
                      {b.label}
                      {b.range && <small>{b.range}</small>}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <Err msg={errs.time} />
          </fieldset>

          <fieldset className="field" id="fs-place">
            <legend>태어난 곳</legend>
            <label className="sr-only" htmlFor="birth-region">태어난 시·도</label>
            <select id="birth-region" value={region ?? ""} disabled={overseas} onChange={(e) => setRegion(e.target.value || null)}>
              <option value="">시·도를 골라 주세요</option>
              {KOREA_REGIONS.map(([r]) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <label className="check" htmlFor="not-korea">
              <input
                type="checkbox"
                id="not-korea"
                checked={overseas}
                onChange={(e) => {
                  setOverseas(e.target.checked);
                  setErrs((x) => ({ ...x, place: undefined }));
                }}
              />
              한국이 아니에요
            </label>
            {overseas && <CitySearch value={city} onChange={setCity} autoFocus />}
            <Err msg={errs.place} />
          </fieldset>

          {copy.FIX_PRIVACY_NOTE && <p className="privacy">{copy.FIX_PRIVACY_NOTE}</p>}

          <fieldset className="field agree" id="fs-agree" ref={agreeRef} aria-describedby="err-agree">
            <legend className="sr-only">필수 동의</legend>
            <div className="agree-row all">
              <label className="check" htmlFor="agree-all">
                <input
                  ref={allRef}
                  type="checkbox"
                  id="agree-all"
                  checked={consented}
                  onChange={(e) => {
                    setConsents(Object.fromEntries(consentItems.map((c) => [c.id, e.target.checked])));
                    if (e.target.checked) setErrs((x) => ({ ...x, agree: undefined }));
                  }}
                />
                모두 동의합니다
              </label>
            </div>
            {consentItems.map((c) => (
              <div key={c.id} className={`agree-row${c.note || c.extraLink ? " col" : ""}`}>
                <div className="flex w-full items-center justify-between gap-2">
                  <label className="check" htmlFor={`agree-${c.id}`}>
                    <input
                      type="checkbox"
                      id={`agree-${c.id}`}
                      required
                      checked={consents[c.id] === true}
                      onChange={(e) => {
                        const next = { ...consents, [c.id]: e.target.checked };
                        setConsents(next);
                        if (allConsented(next, guest)) setErrs((x) => ({ ...x, agree: undefined }));
                      }}
                    />
                    {c.label}
                  </label>
                  {/* 진행 중인 테스트를 잃지 않게 새 탭으로 */}
                  {c.link && (
                    <a className="view" href={c.link.href} target="_blank" rel="noopener" aria-label={`${c.label.replace(/^\[필수\]\s*/, "").replace(/에 동의합니다$/, "")} 보기 (새 탭)`}>
                      {c.link.text}
                    </a>
                  )}
                </div>
                {c.extraLink && (
                  <p className="agree-note">
                    <a href={c.extraLink.href} target="_blank" rel="noopener" className="underline">
                      {c.extraLink.text}
                    </a>
                    도 함께 확인해 주세요.
                  </p>
                )}
                {c.note && <p className="agree-note">{c.note}</p>}
              </div>
            ))}
            <Err msg={errs.agree} id="err-agree" />
          </fieldset>
          <button className="btn block" type="button" aria-disabled={!consented} onClick={submitBirth}>
            다음
          </button>
          {footerCtrl}
        </section>
      )}

      {step === "questions" && (
        <section className="screen on" id="scr-q" aria-labelledby="q-big">
          <h1 className="big" id="q-big">
            {name}님에 대해서 딱 3가지 더 여쭤보겠습니다.
          </h1>
          {QUESTIONS.map((q) => (
            <fieldset key={q.key} className="field q-block" id={`fs-${q.key}`}>
              <legend className="lbl">
                <span className="q-num">{q.tag}</span>
                {q.label}
              </legend>
              <div className="chips">
                {q.options.map((o, i) => (
                  <label key={o} className="chip" htmlFor={`${q.key}-${i}`}>
                    <input
                      type="radio"
                      name={q.key}
                      id={`${q.key}-${i}`}
                      value={o}
                      checked={answers[q.key] === o}
                      onChange={() => setAnswers((a) => ({ ...a, [q.key]: o }))}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <Err msg={errs.q} />
          <button className="btn block" type="button" onClick={submitQuestions}>
            결과 보기
          </button>
          {footerCtrl}
        </section>
      )}

      {step === "loading" && (
        <section className="screen on" id="scr-loading" aria-live="polite" aria-labelledby="loading-title">
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
            <h1 className="big" id="loading-title">
              별의 위치를 계산하는 중…
            </h1>
            <p className="small">{copy.FIX_LOADING ?? ""}</p>
          </div>
        </section>
      )}

      {step === "candidates" && (
        <section className="screen on" id="scr-cand" aria-labelledby="cand-big">
          <h1 className="big" id="cand-big">
            더 나 같은 유형은?
          </h1>
          <p className="small">
            {candidateGrade === "C"
              ? "태어난 시간을 몰라 하루 전체를 30분 간격으로 계산했더니, 유형이 둘 이상으로 나왔어요. 요즘의 나와 더 가까운 쪽을 골라 주세요."
              : "고르신 시간대 안에서 30분 간격으로 계산했더니, 유형이 둘 이상으로 나왔어요. 요즘의 나와 더 가까운 쪽을 골라 주세요."}
          </p>
          <div className="choice night">
            {candidates.map((c) => (
              <button key={c.pick} type="button" aria-pressed="false" onClick={() => fetchResult(answers as Answers, c.pick)}>
                <b>
                  {c.competency} × {c.style}
                </b>
                {c.card ?? ""}
              </button>
            ))}
          </div>
          {footerCtrl}
        </section>
      )}

      {step === "consent" && (
        <section className="screen on">
          <ConsentStep onAgree={saveAndShow} busy={saving} error={error} />
          {footerCtrl}
        </section>
      )}

      {step === "result" && result && (
        <section className="screen on" id="scr-result" aria-labelledby="res-title">
          {saveNote && <p className="err">{saveNote}</p>}
          <FreeResultView
            result={result}
            nickname={name}
            firstTime={firstTime === true}
            resultId={savedId}
            onResult={setResult}
            savePrefill={{ birthDate: year && month && day ? `${year}-${pad(month)}-${pad(day)}` : undefined, nickname: name }}
            onAddTime={() => {
              // B·C등급: 입력한 날짜·장소는 그대로 두고 시간만 다시 넣는 화면으로(새 결과로 저장된다)
              setUnknownTime(false);
              setPick(null);
              setStep("birth");
            }}
          />
          {footerCtrl}
          <SiteFooter />
        </section>
      )}
    </main>
  );
}
