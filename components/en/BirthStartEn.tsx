"use client";

// 영문 출생 정보 입력 화면 /en/start((나) 영문 전용, owner 2026-11-04). 한국어 TestFlow의 생년월일 화면과 따로 관리 —
// 한국어 입력 화면을 고쳐도 이 화면은 따라 바뀌지 않는다(바꿀 때마다 영문판에도 필요한지 owner에게 묻는다).
// 한국어판과 다른 점(21_영문판 개발메모 §2·§3, 영문 정책 08_on-screen-texts §1·§2):
//  - 닉네임을 이 화면에서 함께 받는다
//  - 생년월일: 월 이름 · 일 · 연도(표시 "Apr 1, 1996"), 만 18세 미만은 다음으로 못 간다
//  - 시간: 24시간제 시·분, 모르면 시간대 5개(영문)
//  - 출생지: 도시 검색만(한국 도시 포함 영문 목록, 시·도 드롭다운 없음)
//  - 동의: 빈 체크박스 2개(① 18세·이용약관·개인정보처리방침 ② 출생정보·답변 처리 별도 동의), 둘 다 체크해야 시작
// 계산은 서버(/api/chart)가 한다 — 같은 엔진·같은 결과. 여기서는 확인만 하고 아무것도 저장하지 않는다(저장은 결과 저장 단계에서).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CitySearch, { type PickedCity } from "@/components/test/CitySearch";
import BottomSheet from "@/components/ui/BottomSheet";
import { LegalBody } from "@/components/legal/LegalDocEn";
import SiteFooterEn from "@/components/SiteFooterEn";
import AuthFooterLink from "@/components/auth/AuthFooterLink";
import { track } from "@/lib/analytics/track";
import { enLegalUrl, type LegalBlock } from "@/lib/legal/en/blocks";
import birthConsent from "@/lib/legal/en/birth-details-consent.json";
import {
  EN_BANDS,
  EN_CONSENT_VERSION,
  EN_MONTHS,
  cleanNicknameEn,
  daysInMonth,
  enBirthBody,
  formatDateEn,
  validateEnBirth,
  type EnBirthForm,
  type EnErrors,
} from "@/lib/en/birthForm";

/** 다음 화면(질문)으로 넘기는 이 탭 한정 진행 상태 — 탭을 닫으면 사라진다 */
export const EN_PROGRESS_KEY = "astro_en_progress_v1";

const pad = (n: number) => String(n).padStart(2, "0");
const numOrNull = (v: string) => (v === "" ? null : Number(v));
const THIS_YEAR = new Date().getFullYear();

function Err({ msg, id }: { msg?: string; id?: string }) {
  return (
    <p className="err" id={id} role="alert">
      {msg ?? ""}
    </p>
  );
}

export default function BirthStartEn() {
  const router = useRouter();
  const [f, setF] = useState<EnBirthForm>({
    nickname: "",
    year: null,
    month: null,
    day: null,
    unknownTime: false,
    hour: null,
    minute: null,
    band: null,
    cityId: null,
    agreeTerms: false,
    agreeBirth: false,
  });
  const [city, setCity] = useState<PickedCity | null>(null);
  const [errs, setErrs] = useState<EnErrors>({});
  const [details, setDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState("");

  const set = <K extends keyof EnBirthForm>(k: K, v: EnBirthForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const maxDay = f.month ? daysInMonth(f.year ?? 2000, f.month) : 31;
  const ready = f.agreeTerms && f.agreeBirth;
  // [Start]를 누른 뒤 보이는 오류는 그 칸을 고치는 즉시 사라지거나 바뀐다(눌렀을 때 걸린 칸만, 지금 값으로 다시 검사).
  const live = validateEnBirth({ ...f, nickname: cleanNicknameEn(f.nickname), cityId: city?.id ?? null }, new Date());
  const shown: EnErrors = Object.fromEntries(Object.keys(errs).flatMap((k) => (live[k as keyof EnErrors] ? [[k, live[k as keyof EnErrors]]] : [])));

  async function start() {
    const form = { ...f, nickname: cleanNicknameEn(f.nickname), cityId: city?.id ?? null };
    const e = validateEnBirth(form, new Date());
    setErrs(e);
    setServerErr("");
    const first = (["nickname", "date", "time", "place", "agree"] as const).find((k) => e[k]);
    if (first) {
      document.getElementById(`fs-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      // 서버가 같은 규칙(미래 날짜·도시 id·시간)을 다시 확인한다. 브라우저가 보낸 좌표는 믿지 않고 도시 id로만.
      const res = await fetch("/api/chart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(enBirthBody(form)) });
      if (res.status === 400) {
        setServerErr("Please check your birth details and try again.");
        return;
      }
      if (!res.ok) throw new Error("calc");
      try {
        sessionStorage.setItem(
          EN_PROGRESS_KEY,
          JSON.stringify({ nickname: form.nickname, birth: enBirthBody(form), cityLabel: city?.label ?? "", consent: { version: EN_CONSENT_VERSION, terms: true, birth: true } }),
        );
      } catch {
        /* 비공개 창 등 — 다음 화면에서 다시 입력 */
      }
      track("birth_done", { from: "en" });
      router.push("/en/questions");
    } catch {
      setServerErr("Something went wrong while reading the stars. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div lang="en" className="flex flex-1 flex-col">
      <section className="screen on" id="scr-birth" aria-labelledby="birth-big">
        <h1 className="big" id="birth-big" tabIndex={-1}>
          Great. First, tell us your date of birth, birth time and birthplace.
        </h1>

        <fieldset className="field" id="fs-nickname">
          <legend>Nickname</legend>
          <label className="sr-only" htmlFor="en-nickname">Nickname</label>
          <input
            id="en-nickname"
            type="text"
            maxLength={12}
            autoComplete="nickname"
            placeholder="What should we call you?"
            value={f.nickname}
            onChange={(e) => set("nickname", e.target.value)}
          />
          <Err msg={shown.nickname} />
        </fieldset>

        <fieldset className="field" id="fs-date">
          <legend>Date of birth</legend>
          <div className="row3">
            <div>
              <label className="sr-only" htmlFor="en-month">Month</label>
              <select
                id="en-month"
                value={f.month ?? ""}
                onChange={(e) => {
                  const m = numOrNull(e.target.value);
                  setF((x) => ({ ...x, month: m, day: x.day && m && x.day > daysInMonth(x.year ?? 2000, m) ? null : x.day }));
                }}
              >
                <option value="">Month</option>
                {EN_MONTHS.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="sr-only" htmlFor="en-day">Day</label>
              <select id="en-day" value={f.day && f.day <= maxDay ? f.day : ""} onChange={(e) => set("day", numOrNull(e.target.value))}>
                <option value="">Day</option>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="sr-only" htmlFor="en-year">Year</label>
              <select
                id="en-year"
                value={f.year ?? ""}
                onChange={(e) => {
                  const y = numOrNull(e.target.value);
                  setF((x) => ({ ...x, year: y, day: x.day && x.month && y && x.day > daysInMonth(y, x.month) ? null : x.day }));
                }}
              >
                <option value="">Year</option>
                {Array.from({ length: THIS_YEAR - 1900 + 1 }, (_, i) => THIS_YEAR - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="date-preview" aria-live="polite">
            {f.year && f.month && f.day && f.day <= maxDay ? formatDateEn(f.year, f.month, f.day) : ""}
          </p>
          <p className="hint">Use the date you were actually born on (after midnight counts as the next day).</p>
          <Err msg={shown.date} />
        </fieldset>

        <fieldset className="field" id="fs-time">
          <legend>Birth time (24-hour)</legend>
          {!f.unknownTime && (
            <div className="row2">
              <div>
                <label className="sr-only" htmlFor="en-hour">Hour</label>
                <select id="en-hour" value={f.hour ?? ""} onChange={(e) => set("hour", numOrNull(e.target.value))}>
                  <option value="">Hour</option>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>{pad(h)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="sr-only" htmlFor="en-minute">Minute</label>
                <select id="en-minute" value={f.minute ?? ""} onChange={(e) => set("minute", numOrNull(e.target.value))}>
                  <option value="">Minute</option>
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <option key={m} value={m}>{pad(m)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <label className="check" htmlFor="en-time-unknown">
            <input
              type="checkbox"
              id="en-time-unknown"
              checked={f.unknownTime}
              onChange={(e) => {
                set("unknownTime", e.target.checked);
              }}
            />
            I don’t know the exact time
          </label>
          {f.unknownTime && (
            <div className="chips" role="radiogroup" aria-label="Birth time range">
              {EN_BANDS.map((b) => (
                <label key={b.id} className="chip" htmlFor={`en-band-${b.id}`}>
                  <input type="radio" name="en-band" id={`en-band-${b.id}`} value={b.id} checked={f.band === b.id} onChange={() => set("band", b.id)} />
                  <span>
                    {b.label}
                    {b.range && <small>{b.range}</small>}
                  </span>
                </label>
              ))}
            </div>
          )}
          {f.unknownTime && f.band === "unknown" && (
            <p className="hint">No problem. Without a birth time, your Rising sign and houses can&apos;t be calculated, so those parts will be left out.</p>
          )}
          <Err msg={shown.time} />
        </fieldset>

        <fieldset className="field" id="fs-place">
          <legend>Birthplace</legend>
          <CitySearch value={city} onChange={setCity} lang="en" />
          <Err msg={shown.place} />
        </fieldset>

        <fieldset className="field agree" id="fs-agree" aria-describedby="err-agree">
          <legend className="sr-only">Consent</legend>
          <div className="agree-row col">
            <label className="check" htmlFor="en-agree-terms">
              <input type="checkbox" id="en-agree-terms" checked={f.agreeTerms} onChange={(e) => set("agreeTerms", e.target.checked)} />
              <span>
                I am 18 years old or older, I agree to the{" "}
                <Link href={enLegalUrl("terms")} target="_blank" rel="noopener" className="underline">Terms of Use</Link>, and I have read the{" "}
                <Link href={enLegalUrl("privacy")} target="_blank" rel="noopener" className="underline">Privacy Policy</Link>.
              </span>
            </label>
          </div>
          <div className="agree-row col">
            <label className="check" htmlFor="en-agree-birth">
              <input type="checkbox" id="en-agree-birth" checked={f.agreeBirth} onChange={(e) => set("agreeBirth", e.target.checked)} />
              <span>I agree that SSOL may use my date, time and place of birth and my answers to calculate my birth chart and create my results.</span>
            </label>
            <button type="button" className="view self-start underline" onClick={() => setDetails(true)}>Details</button>
            <p className="agree-note">Used only for your chart · Kept until you delete your account (30 days if you don&apos;t sign in) · You can withdraw anytime.</p>
          </div>
          <Err id="err-agree" msg={shown.agree} />
        </fieldset>

        {serverErr && <Err msg={serverErr} />}
        <button type="button" className="btn block" aria-disabled={!ready} disabled={busy} onClick={() => void start()}>
          {busy ? "Reading your chart…" : "Start"}
        </button>
      </section>

      <BottomSheet open={details} onClose={() => setDetails(false)} labelledBy="en-birth-consent-title">
        <h2 id="en-birth-consent-title" className="text-[17px] font-semibold text-navy">
          Consent for Your Birth Details and Answers
        </h2>
        <div className="mt-3">
          <LegalBody blocks={(birthConsent as LegalBlock[]).slice(1)} />
        </div>
      </BottomSheet>

      <div className="intro-foot">
        <AuthFooterLink lang="en" />
        <SiteFooterEn />
      </div>
    </div>
  );
}
