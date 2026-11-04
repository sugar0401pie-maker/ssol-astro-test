"use client";

// 영문 Cookie settings · Do Not Sell or Share 화면((나) 영문 전용, owner 2026-11-04).
// 문구: 정책 패키지 08_on-screen-texts §5(항목 이름)·§7(Do Not Sell) 그대로, 그 밖 안내 한두 줄은 Claude 초안.
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CC_EVENT, gpcOn, readChoice, saveChoice } from "@/lib/i18n/cookieConsent";
import { enLegalUrl } from "@/lib/legal/en/blocks";

function subscribe(cb: () => void) {
  window.addEventListener(CC_EVENT, cb);
  return () => window.removeEventListener(CC_EVENT, cb);
}
const cookieSnap = () => document.cookie;

function Toggle({ id, label, checked, disabled, onChange }: { id: string; label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 py-2 text-[14px]">
      <input type="checkbox" id={id} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export default function CookieSettingsEn({ mode }: { mode: "settings" | "dns" }) {
  // 서버에서 그릴 때는 빈 값 → 브라우저에서 실제 쿠키로 다시 그린다
  useSyncExternalStore(subscribe, cookieSnap, () => "");
  const saved = typeof document === "undefined" ? null : readChoice();
  const gpc = typeof navigator === "undefined" ? false : gpcOn();
  const [draft, setDraft] = useState<{ analytics: boolean | null; ads: boolean | null }>({ analytics: null, ads: null });
  const [msg, setMsg] = useState("");
  const analytics = draft.analytics ?? saved?.analytics ?? false;
  const ads = gpc ? false : (draft.ads ?? saved?.ads ?? false);

  function save() {
    saveChoice({ analytics, ads });
    setDraft({ analytics: null, ads: null });
    setMsg(mode === "dns" && !ads ? "Saved. We won't share your information for ads on this browser." : "Saved.");
  }

  return (
    <section lang="en">
      {mode === "settings" ? (
        <>
          <h1 className="text-[20px] font-bold text-cream">Cookie settings</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-cream/85">
            Optional cookies stay off until you allow them. Your choice is saved on this browser. See the{" "}
            <Link href={enLegalUrl("cookies")} className="underline">Cookie Policy</Link> for details.
          </p>
          <div className="box mt-4">
            <Toggle id="cc-essential" label="Essential (always on) — sign-in, payment and keeping your results on this device" checked disabled onChange={() => {}} />
            <Toggle id="cc-analytics" label="Analytics — Google Analytics, to see how the site is used" checked={analytics} onChange={(v) => setDraft((d) => ({ ...d, analytics: v }))} />
            <Toggle id="cc-ads" label="Advertising — the X pixel, to measure our X ads" checked={ads} disabled={gpc} onChange={(v) => setDraft((d) => ({ ...d, ads: v }))} />
          </div>
        </>
      ) : (
        <>
          <h1 className="text-[20px] font-bold text-cream">Do Not Sell or Share My Personal Information</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-cream/85">
            We don&apos;t sell your personal information. We do use the X pixel to measure our ads, which California law may treat as &quot;sharing.&quot; Turn it off
            below. We also honor Global Privacy Control signals from your browser.
          </p>
          <div className="box mt-4">
            <Toggle id="cc-ads" label="Allow ad measurement (X)" checked={ads} disabled={gpc} onChange={(v) => setDraft((d) => ({ ...d, ads: v }))} />
          </div>
        </>
      )}
      {gpc && <p className="mt-2 text-[14px] text-cream/85">Your browser sends a Global Privacy Control signal, so ad measurement stays off.</p>}
      <button type="button" className="btn block mt-4" onClick={save}>Save my choices</button>
      {msg && <p className="mt-2 text-[14px] text-cream/85" role="status">{msg}</p>}
    </section>
  );
}
