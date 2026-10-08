"use client";

// 결과 저장 동의(마스터스펙 8-1). 동의해야 저장하고 결과를 보여 준다 — 서버도 consent:true를 다시 확인한다.
import { useState } from "react";
import { CONSENT_CHECK_LABEL, CONSENT_LINES, CONSENT_TITLE, PRIVACY_URL, SENSITIVE_URL } from "@/lib/results/consent";

export default function ConsentStep({ onAgree, busy, error }: { onAgree: () => void; busy: boolean; error: string | null }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-cream">{CONSENT_TITLE}</h1>
      <ul className="flex flex-col gap-2 rounded-2xl bg-cream px-4 py-4 text-sm leading-relaxed text-navy">
        {CONSENT_LINES.map((l) => (
          <li key={l}>• {l}</li>
        ))}
        <li className="text-xs text-navy/70">
          자세한 내용은{" "}
          <a className="underline" href={PRIVACY_URL} target="_blank" rel="noreferrer">개인정보처리방침</a>과{" "}
          <a className="underline" href={SENSITIVE_URL} target="_blank" rel="noreferrer">민감정보 처리방침</a>에서 볼 수 있어요.
        </li>
      </ul>
      <label className="flex items-start gap-2 text-sm text-cream">
        <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        {CONSENT_CHECK_LABEL}
      </label>
      {error && <p className="rounded-xl bg-cream px-3 py-2 text-sm text-navy">{error}</p>}
      <button className="w-full rounded-full bg-gold px-6 py-3 font-bold text-navy disabled:opacity-40" disabled={!checked || busy} onClick={onAgree}>
        {busy ? "저장하는 중…" : "동의하고 결과 보기"}
      </button>
    </div>
  );
}
