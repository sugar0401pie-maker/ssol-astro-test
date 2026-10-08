"use client";

import Link from "next/link";
// 화면 2~7(마스터스펙 6-1): 환영·닉네임 → 경험 확인(→ 처음 안내) → 생년월일·시간·출생지 → 질문 3개 →
// (후보가 갈리면) 캐릭터 후보 선택 → 로그인(이미 로그인했으면 건너뜀) → 저장 동의 → 저장 후 무료 결과.
// '로그인·가입 후 결과'는 스펙의 초안(비로그인 처리 방식은 owner 결정 대기) — 바뀌면 afterReady만 고치면 된다.
// 화면 문구는 스펙 확정본 그대로. 아직 없는 것: 인트로(디저트 테스트와 동일 화면), 역량 동점 확인 화면, 결제.
import { useEffect, useMemo, useState } from "react";
import { Q1_OPTIONS, Q2_OPTIONS, Q3_OPTIONS, Q_LABELS, type Answers } from "@/lib/astro/answers";
import { KOREA_REGIONS } from "@/lib/astro/places";
import type { FreeResult } from "@/lib/report/freeResult";
import { getRealSession } from "@/lib/supabase/browser";
import AuthStep from "@/components/auth/AuthStep";
import CitySearch, { type PickedCity } from "./CitySearch";
import ConsentStep from "./ConsentStep";
import FreeResultView from "./FreeResultView";

type Step = "welcome" | "experience" | "firstTime" | "birth" | "q1" | "q2" | "q3" | "loading" | "candidates" | "auth" | "consent" | "result";

// 카카오·네이버 로그인은 다른 화면에 갔다가 돌아오므로, 그 직전에 진행 상태를 이 탭에만(sessionStorage)
// 잠깐 담아 두고 돌아오면 이어간다. 탭을 닫으면 사라지고, 저장이 끝나면 바로 지운다.
const FLOW_KEY = "astro_flow_v1";
interface SavedFlow {
  nickname: string;
  firstTime: boolean | null;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  unknownTime: boolean;
  band: string;
  region: string;
  overseas: boolean;
  city: PickedCity | null;
  answers: Partial<Answers>;
  pick: string | null;
}
function loadFlow(): SavedFlow | null {
  try {
    const raw = sessionStorage.getItem(FLOW_KEY);
    return raw ? (JSON.parse(raw) as SavedFlow) : null;
  } catch {
    return null;
  }
}
function clearFlow() {
  try {
    sessionStorage.removeItem(FLOW_KEY);
  } catch {
    /* 저장소를 못 쓰는 환경 — 무시 */
  }
}

// 클라이언트 번들에 계산 엔진이 딸려 오지 않도록 시간대 표는 여기 따로 둔다(lib/astro/birth.ts의 TIME_BANDS와 같은 키).
const BANDS = [
  { id: "dawn", label: "새벽 (00–06시)" },
  { id: "morning", label: "오전 (06–12시)" },
  { id: "afternoon", label: "오후 (12–18시)" },
  { id: "evening", label: "저녁 (18–24시)" },
  { id: "unknown", label: "태어난 시간을 잘 모르겠어요" },
] as const;
type BandId = (typeof BANDS)[number]["id"];

interface Candidate {
  /** B6 후보 선택 카드 문장(해석 DB) */
  card?: string;
  /** 화면 이름 — 당분간 동물 이름 대신 유형 한 줄(SHOW_CHARACTER=false) */
  label: string;
  competency: string;
  style: string;
  share: number;
  pick: string;
}

const CURRENT_YEAR = 2026;
const pad = (n: number) => String(n).padStart(2, "0");
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

const btnPrimary =
  "w-full rounded-full bg-gold px-6 py-3 text-base font-bold text-navy disabled:opacity-40";
const btnSecondary = "w-full rounded-full border border-cream px-6 py-3 text-base text-cream";
const field = "w-full rounded-xl bg-cream px-3 py-3 text-base text-navy";

function Big({ children }: { children: React.ReactNode }) {
  return <h1 className="text-xl font-bold leading-relaxed text-cream">{children}</h1>;
}

export default function TestFlow() {
  // 이 컴포넌트는 브라우저에서만 그린다(app/test/TestClient.tsx) — 그래서 첫 상태를 sessionStorage에서 바로 읽어도 된다.
  const [restored] = useState(loadFlow);
  const [step, setStep] = useState<Step>(restored ? "auth" : "welcome");
  const [nickname, setNickname] = useState(restored?.nickname ?? "");
  // 경험 응답: '처음'이면 결과에서 태양·달·상승궁 용어에 한 줄 설명을 붙인다(6-1 기타).
  const [firstTime, setFirstTime] = useState<boolean | null>(restored?.firstTime ?? null);
  const [year, setYear] = useState(restored?.year ?? 1995);
  const [month, setMonth] = useState(restored?.month ?? 1);
  const [day, setDay] = useState(restored?.day ?? 1);
  const [hour, setHour] = useState(restored?.hour ?? 12);
  const [minute, setMinute] = useState(restored?.minute ?? 0);
  const [unknownTime, setUnknownTime] = useState(restored?.unknownTime ?? false);
  const [band, setBand] = useState<BandId>((restored?.band as BandId) ?? "morning");
  const [region, setRegion] = useState<string>(restored?.region ?? "서울");
  const [overseas, setOverseas] = useState(restored?.overseas ?? false);
  const [city, setCity] = useState<PickedCity | null>(restored?.city ?? null);
  const [answers, setAnswers] = useState<Partial<Answers>>(restored?.answers ?? {});
  // 캐릭터 후보를 고른 경우 그 대표 시각 — 저장 요청에도 그대로 보낸다.
  const [pick, setPick] = useState<string | null>(restored?.pick ?? null);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateIntro, setCandidateIntro] = useState("");
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

  const name = nickname.trim();
  const maxDay = daysInMonth(year, month);
  const safeDay = Math.min(day, maxDay);

  const birthTime = useMemo(() => {
    if (!unknownTime) return { kind: "exact", hour, minute } as const;
    if (band === "unknown") return { kind: "unknown" } as const;
    return { kind: "band", band } as const;
  }, [unknownTime, band, hour, minute]);

  const requestBody = (a: Answers, p: string | null) => ({
    birth: { year, month, day: safeDay, time: p ? { ...birthTime, pick: p } : birthTime, place: overseas && city ? { cityId: city.id } : { region } },
    answers: a,
    nickname: name,
  });

  function saveFlow() {
    const f: SavedFlow = { nickname, firstTime, year, month, day: safeDay, hour, minute, unknownTime, band, region, overseas, city, answers, pick };
    try {
      sessionStorage.setItem(FLOW_KEY, JSON.stringify(f));
    } catch {
      /* 저장소를 못 쓰는 환경 — 돌아오면 처음부터 */
    }
  }

  // 결과가 정해진 뒤: 로그인돼 있으면 동의로, 아니면 로그인 화면으로.
  async function afterReady() {
    setStep((await getRealSession()) ? "consent" : "auth");
  }

  async function saveAndShow() {
    setSaving(true);
    setError(null);
    try {
      const session = await getRealSession();
      if (!session) {
        setStep("auth");
        return;
      }
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ...requestBody(answers as Answers, pick), consent: true, firstTime: firstTime === true }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setStep("auth");
        return;
      }
      if (!res.ok || !data.result) throw new Error(data.error ?? "저장하지 못했어요.");
      clearFlow();
      setResult(data.result);
      setSavedId(data.id ?? null);
      setSaveNote(data.saveError ? "결과를 저장하지 못했어요. 이 화면을 닫으면 다시 볼 수 없어요." : null);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function fetchResult(a: Answers, chosen?: string) {
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/result", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody(a, chosen ?? null)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "계산 중 문제가 생겼어요.");
      if (data.candidates) {
        setCandidates(data.candidates);
        setCandidateIntro(data.candidateIntro ?? "");
        setStep("candidates");
      } else {
        setPick(chosen ?? null);
        await afterReady();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "계산 중 문제가 생겼어요.");
      setStep("q3");
    }
  }

  function answer<K extends keyof Answers>(key: K, value: Answers[K], next: Step | null) {
    const a = { ...answers, [key]: value };
    setAnswers(a);
    if (next) setStep(next);
    else void fetchResult(a as Answers);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      {step === "welcome" && (
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (name) setStep("experience");
          }}
        >
          <Big>쏠 점성술 하우스에 오신 당신을 환영합니다.</Big>
          <p className="text-cream/80">당신을 뭐라고 불러드리면 될까요?</p>
          <input
            className={field}
            value={nickname}
            maxLength={12}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => {
              // 한글 조합 중 Enter는 전송으로 처리하지 않는다.
              if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault();
            }}
            aria-label="닉네임"
          />
          <button type="submit" className={btnPrimary} disabled={!name}>
            이렇게 불러주세요
          </button>
        </form>
      )}

      {step === "experience" && (
        <div className="flex flex-col gap-6">
          <Big>
            {name}님, 오늘은 어떤 고민을 가져오셨나요? 그보다, 점성술은 오늘이 처음이신지요?
          </Big>
          <button className={btnSecondary} onClick={() => { setFirstTime(false); setStep("birth"); }}>
            전에 본 적이 있어요
          </button>
          <button className={btnPrimary} onClick={() => { setFirstTime(true); setStep("firstTime"); }}>
            네, 처음이에요
          </button>
        </div>
      )}

      {step === "firstTime" && (
        <div className="flex flex-col gap-6">
          <Big>
            오늘 당신의 태어난 날짜와 시간을 토대로 점성술에 따라 {name}님의 과거와 현재, 미래를 알아봅니다. 우리 쏠
            하우스만의 특제 레시피로 {name}님의 주요 고민에 맞는 웰니스 제안을 해드릴게요. 이제 한 번 해볼까요?
          </Big>
          <button className={btnPrimary} onClick={() => setStep("birth")}>
            네, 좋아요!
          </button>
        </div>
      )}

      {step === "birth" && (
        <div className="flex flex-col gap-5">
          <Big>좋습니다. 먼저 {name}님의 생년월일과 태어난 시간, 태어난 곳을 알려주세요.</Big>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-cream/80">생년월일 (양력)</legend>
            <div className="grid grid-cols-3 gap-2">
              <select className={field} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="연도">
                {Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i).map((y) => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select className={field} value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="월">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
              <select className={field} value={safeDay} onChange={(e) => setDay(Number(e.target.value))} aria-label="일">
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}일</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-cream/70">
              {year}-{pad(month)}-{pad(safeDay)} · 실제로 태어난 날짜 기준이에요(자정 이후 출생이면 다음 날).
            </p>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-cream/80">태어난 시간</legend>
            {!unknownTime && (
              <div className="grid grid-cols-2 gap-2">
                <select className={field} value={hour} onChange={(e) => setHour(Number(e.target.value))} aria-label="시">
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>{pad(h)}시</option>
                  ))}
                </select>
                <select className={field} value={minute} onChange={(e) => setMinute(Number(e.target.value))} aria-label="분">
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <option key={m} value={m}>{pad(m)}분</option>
                  ))}
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-cream">
              <input type="checkbox" checked={unknownTime} onChange={(e) => setUnknownTime(e.target.checked)} />
              정확한 시간을 몰라요
            </label>
            {unknownTime && (
              <div className="flex flex-col gap-2">
                {BANDS.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 rounded-xl border border-cream/30 px-3 py-2 text-sm text-cream">
                    <input type="radio" name="band" checked={band === b.id} onChange={() => setBand(b.id)} />
                    {b.label}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-cream/80">태어난 곳</legend>
            <select className={field} value={region} disabled={overseas} onChange={(e) => setRegion(e.target.value)} aria-label="시·도">
              {KOREA_REGIONS.map(([r]) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-cream">
              <input type="checkbox" checked={overseas} onChange={(e) => setOverseas(e.target.checked)} />
              한국이 아니에요
            </label>
            {overseas && <CitySearch value={city} onChange={setCity} />}
          </fieldset>

          {copy.FIX_PRIVACY_NOTE && <p className="text-xs leading-relaxed text-cream/60">{copy.FIX_PRIVACY_NOTE}</p>}
          <button className={btnPrimary} disabled={overseas && !city} onClick={() => setStep("q1")}>
            다음
          </button>
        </div>
      )}

      {(step === "q1" || step === "q2" || step === "q3") && (
        <div className="flex flex-col gap-5">
          <Big>{name}님에 대해서 딱 3가지 더 여쭤보겠습니다.</Big>
          <p className="text-sm text-cream/70">{step === "q1" ? "1" : step === "q2" ? "2" : "3"} / 3</p>
          <h2 className="text-lg font-bold text-cream">{Q_LABELS[step === "q1" ? "Q1" : step === "q2" ? "Q2" : "Q3"]}</h2>
          {error && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            {(step === "q1" ? Q1_OPTIONS : step === "q2" ? Q2_OPTIONS : Q3_OPTIONS).map((o) => (
              <button
                key={o}
                className="rounded-xl border border-cream/40 px-3 py-3 text-base text-cream hover:border-gold"
                onClick={() =>
                  step === "q1"
                    ? answer("q1", o as Answers["q1"], "q2")
                    : step === "q2"
                      ? answer("q2", o as Answers["q2"], "q3")
                      : answer("q3", o as Answers["q3"], null)
                }
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-cream">
          <p className="text-center leading-relaxed">{copy.FIX_LOADING || "태어난 순간의 하늘을 그리고 있어요."}</p>
        </div>
      )}

      {step === "candidates" && (
        <div className="flex flex-col gap-5">
          <Big>요즘의 나와 더 가까운 건?</Big>
          {candidateIntro && <p className="text-sm leading-relaxed text-cream/80">{candidateIntro}</p>}
          {candidates.map((c) => (
            <button
              key={c.pick}
              className="flex flex-col gap-1 rounded-2xl border border-cream/40 px-4 py-3 text-left text-cream hover:border-gold"
              onClick={() => fetchResult(answers as Answers, c.pick)}
            >
              <span className="font-bold">{c.label} ({c.competency} × {c.style})</span>
              {c.card && <span className="text-sm leading-relaxed text-cream/80">{c.card}</span>}
            </button>
          ))}
        </div>
      )}

      {step === "auth" && <AuthStep onSignedIn={() => setStep((s) => (s === "auth" ? "consent" : s))} beforeRedirect={saveFlow} />}

      {step === "consent" && <ConsentStep onAgree={saveAndShow} busy={saving} error={error} />}

      {step === "result" && result && (
        <>
          {saveNote && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{saveNote}</p>}
          <FreeResultView result={result} nickname={name} firstTime={firstTime === true} resultId={savedId} />
          <Link href="/results" className="text-center text-sm text-cream underline">내 결과 모아 보기</Link>
        </>
      )}
    </main>
  );
}
