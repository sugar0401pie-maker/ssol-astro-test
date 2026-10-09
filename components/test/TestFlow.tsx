"use client";

import Link from "next/link";
// 화면 2~7(마스터스펙 6-1): 환영·닉네임 → 경험 확인(→ 처음 안내) → 생년월일·시간·출생지 → 질문 3개 →
// (후보가 갈리면) 유형 후보 선택 → 저장 동의 → 저장(로그인했으면 계정, 아니면 비회원 익명) → 무료 결과 + 비회원이면 저장 권유.
// '로그인·가입 후 결과'는 스펙의 초안(비로그인 처리 방식은 owner 결정 대기) — 바뀌면 afterReady만 고치면 된다.
// 화면 문구는 스펙 확정본 그대로. 아직 없는 것: 인트로(디저트 테스트와 동일 화면), 역량 동점 확인 화면, 결제.
import { useEffect, useMemo, useRef, useState } from "react";
import { Q1_OPTIONS, Q2_OPTIONS, Q3_OPTIONS, Q_LABELS, type Answers } from "@/lib/astro/answers";
import { isPage, pathOf, prevStep, restorableStep, stepFromPath, type Progress } from "./steps";
import { KOREA_REGIONS } from "@/lib/astro/places";
import type { FreeResult } from "@/lib/report/freeResult";
import { getRealSession } from "@/lib/supabase/browser";
import { apiHeaders } from "@/lib/guest/client";
import CitySearch, { type PickedCity } from "./CitySearch";
import ConsentStep from "./ConsentStep";
import { allConsented, CONSENT_ITEMS, CONSENT_LINES, type ConsentItemId } from "@/lib/results/consent";
import FreeResultView from "./FreeResultView";

import type { Step } from "./steps";

// (예전 흐름) 결과 전에 카카오·네이버 로그인을 다녀올 때 진행 상태를 이 탭에만(sessionStorage) 담아 뒀다.
// 지금은 결과를 먼저 보여 주고 로그인은 결과 화면에서 권하므로 새로 담지 않고, 남아 있던 값만 이어 받아 저장 후 지운다.
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
  competencyPick?: string | null;
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

// 화면마다 주소가 있어(/test/birth 등) 새로고침해도 이 탭 안에서는 이어 가도록 진행 상태를 sessionStorage에 둔다.
// 탭을 닫으면 사라지고, 결과를 저장하면 출생 정보는 지우고 결과 id만 남긴다.
const PROGRESS_KEY = "astro_test_progress_v1";
type SavedProgress = SavedFlow & { consents?: Partial<Record<ConsentItemId, boolean>>; savedId?: string | null };
function loadProgress(): SavedProgress | null {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as SavedProgress) : null;
  } catch {
    return null;
  }
}
function storeProgress(p: SavedProgress | { savedId: string }) {
  try {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* 저장소를 못 쓰는 환경 — 새로고침하면 처음부터 */
  }
}

/** 첫 화면: 예전 로그인 흐름에서 돌아왔으면 동의 화면, 아니면 주소의 화면(앞 답이 없으면 답이 있는 화면까지) */
function initialStep(oldFlow: SavedFlow | null, progress: SavedProgress | null): Step {
  if (oldFlow) return "consent";
  const requested = stepFromPath(window.location.pathname) ?? "welcome";
  if (requested === "welcome" || !progress?.nickname) return "welcome";
  const p: Progress = {
    nickname: progress.nickname,
    firstTime: progress.firstTime,
    consented: allConsented(progress.consents ?? {}),
    answers: progress.answers as Progress["answers"],
  };
  return restorableStep(requested, p);
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
  const [oldFlow] = useState(loadFlow);
  const [progress] = useState(() => (oldFlow ? null : loadProgress()));
  const restored: SavedProgress | null = oldFlow ?? progress;
  const [step, setStepState] = useState<Step>(() => initialStep(oldFlow, progress));
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
  // 생년월일 화면의 필수 동의 3가지(개인정보처리방침·약관·저장). 셋 다 체크해야 다음으로 넘어간다(owner 결정 2026-10-09).
  const [consents, setConsents] = useState<Partial<Record<ConsentItemId, boolean>>>(restored?.consents ?? {});
  const consented = allConsented(consents);
  // 캐릭터 후보를 고른 경우 그 대표 시각 — 저장 요청에도 그대로 보낸다.
  const [pick, setPick] = useState<string | null>(restored?.pick ?? null);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  // 역량 동점 확인에서 고른 역량(저장 요청에도 그대로 보낸다)
  const [competencyPick, setCompetencyPick] = useState<string | null>(restored?.competencyPick ?? null);
  const [tie, setTie] = useState<{ intro: string; options: Array<{ competency: string; style: string; label: string; card: string }> } | null>(null);
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

  // ---- 화면 주소와 뒤로 가기 ----
  // 지나온 화면 목록(이 탭에서 이 컴포넌트가 push한 것). 뒤로 가기 버튼·브라우저 뒤로 가기가 같은 목록을 쓴다.
  const trail = useRef<{ stack: Step[]; pos: number }>({ stack: [step], pos: 0 });
  useEffect(() => {
    // 처음 주소를 실제 화면에 맞춘다(새로고침으로 되돌아간 경우 등)
    if (isPage(step) && window.location.pathname !== pathOf(step)) window.history.replaceState(null, "", pathOf(step));
    // 저장된 결과 화면을 새로고침했으면 그 결과로
    const asked = stepFromPath(window.location.pathname);
    if (!oldFlow && progress?.savedId && (asked === "result" || asked === "candidates" || asked === "tie")) window.location.replace(`/results/${progress.savedId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function setStep(next: Step) {
    setStepState(next);
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
      // 다시 그릴 수 없는 화면(계산 결과가 없는 후보·결과)이면 마지막 질문으로
      const drawable = (target === "candidates" && candidates.length === 0) || (target === "tie" && !tie) || (target === "result" && !result) ? "q3" : target;
      setStepState(drawable);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [candidates.length, tie, result]);
  function goBack() {
    const prev = prevStep(step, firstTime);
    if (!prev) return;
    // 이 탭에서 지나온 화면이면 브라우저 뒤로 가기와 똑같이, 아니면(새로고침 직후) 주소만 바꿔 이동
    if (trail.current.pos > 0 && trail.current.stack[trail.current.pos - 1] === prev) window.history.back();
    else {
      setStepState(prev);
      window.history.replaceState(null, "", pathOf(prev));
      trail.current = { stack: [prev], pos: 0 };
    }
  }

  const name = nickname.trim();
  const maxDay = daysInMonth(year, month);
  const safeDay = Math.min(day, maxDay);

  // 진행 상태를 이 탭에 담아 둔다(새로고침해도 이어 가기). 결과를 저장한 뒤에는 결과 id만.
  useEffect(() => {
    if (savedId) storeProgress({ savedId });
    else if (step !== "result")
      storeProgress({ nickname, firstTime, year, month, day, hour, minute, unknownTime, band, region, overseas, city, answers, pick, competencyPick, consents });
  }, [savedId, step, nickname, firstTime, year, month, day, hour, minute, unknownTime, band, region, overseas, city, answers, pick, competencyPick, consents]);

  const birthTime = useMemo(() => {
    if (!unknownTime) return { kind: "exact", hour, minute } as const;
    if (band === "unknown") return { kind: "unknown" } as const;
    return { kind: "band", band } as const;
  }, [unknownTime, band, hour, minute]);

  const requestBody = (a: Answers, p: string | null, cp: string | null = competencyPick) => ({
    birth: {
      year,
      month,
      day: safeDay,
      time: p ? { ...birthTime, pick: p } : birthTime,
      place: overseas && city ? { cityId: city.id } : { region },
      ...(cp ? { competencyPick: cp } : {}),
    },
    answers: a,
    nickname: name,
  });

  // 결과가 정해진 뒤: 생년월일 화면에서 이미 동의했으니 바로 저장하고 결과를 보여 준다(로그인 없이 먼저 보고, 저장은 결과 화면에서 권한다).
  // 동의 화면은 저장이 실패했을 때 다시 시도하는 자리로만 남는다.
  async function afterReady() {
    if (consented) await saveAndShow();
    else setStep("consent");
  }

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
      clearFlow();
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

  // 차트 미리 계산(6-1 화면 5 '차트 계산은 이 동안 백그라운드에서'): 출생 정보 화면을 넘기는 순간 계산을 시작해 두고,
  // 질문 3개를 마치면 그 답을 쓴다. 후보·동점 판정은 출생 정보로만 정해져서(질문 답과 무관) 임시 답으로 미리 물어도 결과가 같다.
  // 출생 정보가 바뀌었으면(키가 다르면) 쓰지 않고 새로 묻는다.
  const prefetch = useRef<{ key: string; promise: Promise<{ ok: boolean; data: Record<string, unknown> }> } | null>(null);
  const birthKey = () => JSON.stringify(requestBody({ q1: Q1_OPTIONS[0], q2: Q2_OPTIONS[0], q3: Q3_OPTIONS[0] } as Answers, null, null).birth);
  const postResult = (body: unknown) =>
    fetch("/api/result", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (res) => ({
      ok: res.ok,
      data: (await res.json()) as Record<string, unknown>,
    }));
  function startPrefetch() {
    const key = birthKey();
    if (prefetch.current?.key === key) return;
    const promise = postResult(requestBody({ q1: Q1_OPTIONS[0], q2: Q2_OPTIONS[0], q3: Q3_OPTIONS[0] } as Answers, null, null));
    promise.catch(() => {}); // 실패하면 질문을 마친 뒤 다시 묻는다
    prefetch.current = { key, promise };
  }

  async function fetchResult(a: Answers, chosen?: string, cp: string | null = competencyPick) {
    setStep("loading");
    setError(null);
    try {
      const cached = !chosen && !cp && prefetch.current?.key === birthKey() ? await prefetch.current.promise.catch(() => null) : null;
      const { ok, data } = cached?.ok ? cached : await postResult(requestBody(a, chosen ?? null, cp));
      if (!ok) throw new Error((data.error as string) ?? "계산 중 문제가 생겼어요.");
      if (data.candidates) {
        setCandidates(data.candidates as Candidate[]);
        setCandidateIntro((data.candidateIntro as string) ?? "");
        setStep("candidates");
      } else if (data.tie) {
        // 역량 동점 — 후보 시각은 정해졌으니 기억해 두고, 어느 쪽이 더 가까운지 고르게 한다.
        setPick(chosen ?? null);
        setTie(data.tie as typeof tie);
        setStep("tie");
      } else {
        setPick(chosen ?? null);
        setCompetencyPick(cp);
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
      {prevStep(step, firstTime) && (
        <button type="button" className="self-start text-sm text-cream/80" onClick={goBack}>
          ← 이전
        </button>
      )}
      {step === "welcome" && (
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (name) setStep("experience");
          }}
        >
          <Big>쏠 아스트로 하우스에 오신 당신을 환영합니다.</Big>
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

          <fieldset className="flex flex-col gap-3 rounded-2xl border border-cream/30 px-4 py-4">
            <legend className="px-1 text-sm text-cream/80">동의</legend>
            <label className="flex items-start gap-2 text-sm font-bold text-cream">
              <input
                type="checkbox"
                className="mt-1"
                checked={consented}
                onChange={(e) => setConsents(Object.fromEntries(CONSENT_ITEMS.map((c) => [c.id, e.target.checked])))}
              />
              모두 동의합니다.
            </label>
            {CONSENT_ITEMS.map((c) => (
              <label key={c.id} className="flex items-start gap-2 text-sm leading-relaxed text-cream/90">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consents[c.id] === true}
                  onChange={(e) => setConsents((v) => ({ ...v, [c.id]: e.target.checked }))}
                />
                <span>
                  {c.label}
                  {c.link && (
                    <>
                      {" "}
                      {/* 진행 중인 테스트를 잃지 않게 새 탭으로 */}
                      <a href={c.link.href} target="_blank" rel="noreferrer" className="underline">{c.link.text}</a>
                    </>
                  )}
                </span>
              </label>
            ))}
            <details className="text-xs leading-relaxed text-cream/70">
              <summary className="cursor-pointer">저장되는 정보와 보관 기간 자세히</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {CONSENT_LINES.map((l) => (
                  <li key={l}>• {l}</li>
                ))}
              </ul>
            </details>
          </fieldset>

          <button className={btnPrimary} disabled={(overseas && !city) || !consented} onClick={() => { startPrefetch(); setStep("q1"); }}>
            다음
          </button>
          {!consented && <p className="-mt-3 text-center text-xs text-cream/70">세 가지 모두 동의해야 다음으로 넘어갈 수 있어요.</p>}
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
          <Big>더 나 같은 유형은?</Big>
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

      {step === "tie" && tie && (
        <div className="flex flex-col gap-5">
          <Big>요즘 더 가까운 쪽은?</Big>
          {tie.intro && <p className="text-sm leading-relaxed text-cream/80">{tie.intro}</p>}
          {tie.options.map((o) => (
            <button
              key={o.competency}
              className="flex flex-col gap-1 rounded-2xl border border-cream/40 px-4 py-3 text-left text-cream hover:border-gold"
              onClick={() => fetchResult(answers as Answers, pick ?? undefined, o.competency)}
            >
              <span className="font-bold">{o.label} ({o.competency} × {o.style})</span>
              {o.card && <span className="text-sm leading-relaxed text-cream/80">{o.card}</span>}
            </button>
          ))}
        </div>
      )}

      {step === "consent" && <ConsentStep onAgree={saveAndShow} busy={saving} error={error} />}

      {step === "result" && result && (
        <>
          {saveNote && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{saveNote}</p>}

          <FreeResultView
            result={result}
            nickname={name}
            firstTime={firstTime === true}
            resultId={savedId}
            savePrefill={{ birthDate: `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`, nickname: name }}
            onAddTime={() => {
              // C등급: 입력한 날짜·장소는 그대로 두고 시간만 다시 넣는 화면으로(새 결과로 저장된다)
              setUnknownTime(false);
              setPick(null);
              setCompetencyPick(null);
              setStep("birth");
            }}
          />
          <Link href="/results" className="text-center text-sm text-cream underline">내 결과 모아 보기</Link>
        </>
      )}
    </main>
  );
}
