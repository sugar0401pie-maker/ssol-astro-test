"use client";

// 영문 결과의 [Share] [Save] 줄((나) 영문 전용 — 공유 채널이 한국어판과 다르다, owner 2026-11-04: 인스타그램 → X → 레딧 순,
// 카카오톡·네이버 블로그 없음). 공유하는 것은 영문 첫 화면 주소뿐(결과 주소는 본인 전용, 출생 정보 없음).
// 한국어 ActionRow/ShareSheet를 고쳐도 이 파일은 따라 바뀌지 않는다.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/ui/BottomSheet";
import Toast, { useToast } from "@/components/ui/Toast";
import { track } from "@/lib/analytics/track";
import { getRealSession } from "@/lib/supabase/browser";

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

  return (
    <>
      <div className="act-row" lang="en">
        <button type="button" className="btn ghost act-btn" onClick={() => { setOpen(true); track("share_open"); }}>
          Share
        </button>
        <button type="button" className="btn ghost act-btn" onClick={save}>
          Save
        </button>
      </div>
      <BottomSheet open={open} onClose={() => setOpen(false)} labelledBy="en-share-title">
        <h3 id="en-share-title">Share SSOL Astro House</h3>
        <p className="muted">We share the site link only — never your birth details or your results page.</p>
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" className="btn block" onClick={() => void instagram()}>Instagram</button>
          <button type="button" className="btn block" onClick={() => open2(`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(shareUrl("x"))}`, "x")}>X (Twitter)</button>
          <button type="button" className="btn block" onClick={() => open2(`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl("reddit"))}&title=${encodeURIComponent("My birth chart reading from SSOL Astro House")}`, "reddit")}>Reddit</button>
          <button type="button" className="btn ghost block" onClick={() => void copyLink("link_copy")}>Copy link</button>
        </div>
      </BottomSheet>
      <Toast msg={toast} />
    </>
  );
}
