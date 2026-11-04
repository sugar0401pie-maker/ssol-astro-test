"use client";

// 영문 결과의 [Share] [Save] 줄((나) 영문 전용 — 공유 채널이 한국어판과 다르다. owner 2026-11-04: 인스타그램·X·왓츠앱·메시지(문자),
// 실제 브랜드 로고(Simple Icons), 공유 버튼은 눈에 띄게. 카카오톡·네이버 블로그 없음, 레딧은 빠짐). 공유하는 것은 영문 첫 화면 주소뿐(결과 주소는 본인 전용, 출생 정보 없음).
// 한국어 ActionRow/ShareSheet를 고쳐도 이 파일은 따라 바뀌지 않는다.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/ui/BottomSheet";
import Toast, { useToast } from "@/components/ui/Toast";
import { track } from "@/lib/analytics/track";
import { getRealSession } from "@/lib/supabase/browser";
import { BRAND_PATHS } from "@/components/share/brandIcons";

const brand = (k: keyof typeof BRAND_PATHS, size: number) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path fill="#fff" d={BRAND_PATHS[k]} />
  </svg>
);
const LINK_ICON = (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="M10.5 13.5a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.2 1.2M13.5 10.5a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.2-1.2" fill="none" stroke="#013566" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SHARE_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SITE = "https://astro.ssolwellnesshouse.com/en";
// 공유 글(Claude 초안 — 원어민 검수 대상)
const SHARE_TEXT = "I read my birth chart at SSOL Astro House. See what the sky says about you:";

const shareUrl = (channel: string) => `${SITE}?utm_source=${channel}&utm_medium=share`;

export default function ActionRowEn({ resultId, page, saveDone }: { resultId: string | null; page: number; saveDone: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useToast();
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    void getRealSession().then((s) => setLoggedIn(!!s));
  }, []);

  async function copyLink(channel: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(channel));
      setToast("Link copied");
    } catch {
      setToast("Couldn’t copy the link. Please copy it from the address bar.");
    }
  }

  async function instagram() {
    track("share_done", { channel: "instagram" });
    // 웹에서 인스타그램에 바로 올리는 주소가 없어 기기 공유창으로 넘기고, 없으면 링크 복사
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ text: SHARE_TEXT, url: shareUrl("instagram") });
        return;
      } catch {
        /* 닫으면 그대로 */
        return;
      }
    }
    await copyLink("instagram");
  }

  const open2 = (url: string, channel: string) => {
    track("share_done", { channel });
    window.open(url, "_blank", "noopener");
  };

  function save() {
    track("save_click", { from: "en" });
    if (loggedIn) {
      setToast(saveDone || "Saved!");
      return;
    }
    const next = resultId ? `/en/results/${resultId}/${page}` : "/en";
    router.push(`/en/login?next=${encodeURIComponent(next)}`);
  }

  const channels: Array<{ key: string; label: string; bg: string; icon: React.ReactNode; go: () => void }> = [
    { key: "instagram", label: "Instagram", bg: "linear-gradient(45deg,#F58529,#DD2A7B 45%,#8134AF 75%,#515BD4)", icon: brand("instagram", 24), go: () => void instagram() },
    { key: "x", label: "X", bg: "#000", icon: brand("x", 20), go: () => open2(`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(shareUrl("x"))}`, "x") },
    { key: "whatsapp", label: "WhatsApp", bg: "#25D366", icon: brand("whatsapp", 24), go: () => open2(`https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${shareUrl("whatsapp")}`)}`, "whatsapp") },
    {
      key: "messages",
      label: "Messages",
      bg: "#34C759",
      icon: brand("imessage", 24),
      // 문자 앱을 연다(iOS·안드로이드 둘 다 받는 sms:?&body= 모양)
      go: () => {
        track("share_done", { channel: "messages" });
        window.location.href = `sms:?&body=${encodeURIComponent(`${SHARE_TEXT} ${shareUrl("messages")}`)}`;
      },
    },
    { key: "link", label: "Copy link", bg: "#E9E3D6", icon: LINK_ICON, go: () => { track("share_done", { channel: "link_copy" }); void copyLink("link_copy"); } },
  ];

  return (
    <>
      <div className="act-row" lang="en">
        {/* 공유 버튼은 눈에 띄게(owner) — 크림 바탕·남색 글자 + 아이콘, 저장은 테두리 버튼 */}
        <button type="button" className="btn act-btn share-en" onClick={() => { setOpen(true); track("share_open"); }}>
          {SHARE_ICON}
          Share
        </button>
        <button type="button" className="btn ghost act-btn" onClick={save}>
          Save
        </button>
      </div>
      <BottomSheet open={open} onClose={() => setOpen(false)} labelledBy="en-share-title">
        <h3 id="en-share-title">Share SSOL Astro House</h3>
        <p className="kicker">We share the site link only — never your birth details or your results page.</p>
        <div className="share-grid">
          {channels.map((c) => (
            <button key={c.key} type="button" id={`share-${c.key}`} onClick={c.go}>
              <i style={{ background: c.bg }}>{c.icon}</i>
              {c.label}
            </button>
          ))}
        </div>
      </BottomSheet>
      <Toast msg={toast} />
    </>
  );
}
