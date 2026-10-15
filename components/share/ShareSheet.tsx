"use client";

// 공유 시트(마스터스펙 6-1 화면 9, 2026-10-09 프로토타입 shareSheet): 카카오톡 · 링크 복사 · 네이버 블로그 · X(트위터) · 인스타그램 · 유튜브.
// 결과 주소는 본인만 열 수 있어서 공유하지 않는다 — 사이트 첫 화면 주소와, 출생 정보가 없는 공유 이미지만.
// 공유 이미지(owner 2026-10-11): 내 태양 별자리 그림 하나(무작위) + 별자리 이름·소개(A1). 휴대폰은 공유창으로 그림까지,
// 컴퓨터의 X는 글·링크만(웹 주소로는 그림을 못 넘김).
// 카카오톡은 기기 공유창(그 안의 카카오톡)으로 보낸다 — 카카오 SDK 앱 키 없이 되는 방법. 공유창이 없으면 주소를 복사해 안내.
// 인스타그램·유튜브는 웹에서 바로 올리는 주소가 없어, 공유 이미지를 기기 공유창으로 넘기거나 저장한 뒤 앱에서 올리도록 안내한다.
import { track } from "@/lib/analytics/track";
import { useEffect, useRef, useState } from "react";
import type { NatalChart } from "@/lib/astro/natal";
import BottomSheet from "@/components/ui/BottomSheet";
import { BRAND_PATHS } from "./brandIcons";
import { composeSignShare } from "./shareImage";
import KakaoTalkLogo from "./KakaoTalkLogo";
import { balancedTwoLines, kakaoArtUrl, pickSignArt, signShareMessage, signShareTexts } from "@/lib/share/signShare";
import { KAKAO_CARD_ENABLED, preloadKakao, shareKakaoCard } from "./kakaoShare";
import { newSlug, shareUrl, type ShareChannel } from "@/lib/attribution/attribution";
import { apiHeaders } from "@/lib/guest/client";
import { getRealSession } from "@/lib/supabase/browser";

export const SITE_URL = "https://astro.ssolwellnesshouse.com";

export interface ShareProps {
  chart: NatalChart;
  sunSign: string;
  sunSignIndex: number;
  typeLine: string;
  competency: string;
  style: string;
  nickname: string;
  /** 공유 이미지·글에 넣을 태양 별자리 소개(A1) */
  sunSignIntro: { oneLiner: string; keywords: string } | null;
}

type ShareKey = "kakao" | "link" | "blog" | "x" | "insta" | "youtube";
const LINK_ICON = (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="M10.5 13.5a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.2 1.2M13.5 10.5a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.2-1.2" fill="none" stroke="#013566" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const brand = (k: keyof typeof BRAND_PATHS, fill: string, size: number) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path fill={fill} d={BRAND_PATHS[k]} />
  </svg>
);
/** 공유 버튼 → 유입 경로의 utm_source 값 */
const CHANNEL: Record<ShareKey, ShareChannel> = { kakao: "kakao", link: "link_copy", blog: "naver_blog", x: "x", insta: "instagram", youtube: "youtube" };

const SHARES: Array<{ key: ShareKey; label: string; bg: string; icon: React.ReactNode }> = [
  { key: "kakao", label: "카카오톡", bg: "#FEE500", icon: <KakaoTalkLogo size={34} /> },
  { key: "link", label: "링크 복사", bg: "#E9E3D6", icon: LINK_ICON },
  { key: "blog", label: "네이버 블로그", bg: "#03C75A", icon: brand("naver", "#fff", 20) },
  { key: "x", label: "X(트위터)", bg: "#000", icon: brand("x", "#fff", 20) },
  { key: "insta", label: "인스타그램", bg: "linear-gradient(45deg,#F58529,#DD2A7B 45%,#8134AF 75%,#515BD4)", icon: brand("instagram", "#fff", 24) },
  { key: "youtube", label: "유튜브", bg: "#FF0000", icon: brand("youtube", "#fff", 24) },
];

export default function ShareSheet({ open, onClose, resultId = null, ...props }: ShareProps & { open: boolean; onClose: () => void; resultId?: string | null }) {
  const [note, setNote] = useState<string | null>(null);
  const [png, setPng] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // 별자리 그림 하나(무작위, 시트가 처음 만들어질 때 한 번) — 화면에 그리는 값이 아니라 이미지 합성·카카오 카드에만 쓴다
  const [artPath] = useState(() => pickSignArt(props.sunSignIndex));

  useEffect(() => {
    if (!open || png) return;
    let alive = true;
    // 별자리 그림 하나(무작위) + 별자리 소개(owner 2026-10-11). 그림을 못 불러오면 미리보기 없이 글·링크만 공유된다.
    const art = artPath;
    if (!art) return;
    if (KAKAO_CARD_ENABLED) preloadKakao();
    void composeSignShare(art, signShareTexts(props.sunSign, props.sunSignIntro)).then((b) => {
      if (!alive) return;
      setPng(b);
      setPreview(b ? URL.createObjectURL(b) : null);
    });
    return () => {
      alive = false;
    };
    // props는 결과가 바뀌지 않는 한 같다 — 시트를 처음 열 때 한 번 만든다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  // 공유 링크 코드(owner 2026-10-15): 채널마다 무작위 코드 하나(시트를 연 동안 같은 채널은 같은 코드).
  // 코드는 브라우저가 바로 만들고 기록은 따로 보낸다 — 휴대폰 공유창은 버튼을 누른 직후에만 열려서 기록을 기다리지 않는다.
  const links = useRef<Partial<Record<ShareChannel, string>>>({});
  function linkFor(key: ShareKey): string {
    const channel = CHANNEL[key];
    const known = links.current[channel];
    if (known) return known;
    const slug = newSlug((n) => crypto.getRandomValues(new Uint8Array(n)));
    const url = shareUrl(SITE_URL, slug, channel);
    links.current[channel] = url;
    void getRealSession()
      .catch(() => null)
      .then((session) =>
        fetch("/api/share-links", {
          method: "POST",
          keepalive: true,
          headers: apiHeaders(session, { "content-type": "application/json" }),
          body: JSON.stringify({ slug, channel, resultId }),
        }),
      )
      .catch(() => {
        /* 기록이 안 돼도 링크는 그대로 동작한다(utm으로 채널은 남음) */
      });
    return url;
  }

  const file = png ? new File([png], "ssol-astro.png", { type: "image/png" }) : null;
  const canShareFile = !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });

  async function copyLink(url: string, msg = "링크를 복사했어요") {
    try {
      await navigator.clipboard.writeText(url);
      setNote(msg);
    } catch {
      setNote(`복사가 막혀 있어요. 이 주소를 복사해 주세요: ${url}`);
    }
  }

  function saveImage() {
    if (!png) return false;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(png);
    a.download = "ssol-astro.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return true;
  }

  async function share(key: ShareKey) {
    setNote(null);
    track("share_done", { channel: key });
    const enc = encodeURIComponent;
    const url = linkFor(key);
    // 공유 글: 내 태양 별자리 + 소개 한 줄(owner 2026-10-11). 출생 날짜·시간·장소·닉네임은 넣지 않는다.
    const message = signShareMessage(props.sunSign, props.sunSignIntro);
    /** 휴대폰 공유창으로 그림+글 보내기(카카오톡·X·인스타그램 앱이 그림을 받는다). 됐으면 true. */
    const shareFile = async () => {
      if (!canShareFile || !file) return false;
      try {
        await navigator.share({ files: [file], text: `${message}\n${url}` });
      } catch {
        /* 사용자가 공유를 취소 */
      }
      return true;
    };
    switch (key) {
      case "link":
        return copyLink(url);
      case "kakao":
        // 카카오 카드(그림·별자리 소개·[나도 별 리포트 보기] 버튼) — JavaScript 키와 도메인 등록이 돼 있을 때만, 아니면 기기 공유창
        if (artPath && props.sunSignIntro && (await shareKakaoCard({ title: `${props.sunSign} — 쏠 아스트로 하우스`, description: balancedTwoLines(props.sunSignIntro.oneLiner), imageUrl: kakaoArtUrl(artPath), url }))) return;
        if (await shareFile()) return;
        if (navigator.share) {
          try {
            await navigator.share({ title: "쏠 아스트로 하우스", text: message, url });
          } catch {
            /* 취소 */
          }
          return;
        }
        return copyLink(url, "링크를 복사했어요. 카카오톡 대화창에 붙여 넣어 보내 주세요.");
      case "blog":
        window.open(`https://share.naver.com/web/shareView?url=${enc(url)}&title=${enc(message.split("\n")[0])}`, "_blank", "noopener");
        return;
      case "x":
        // 휴대폰이면 그림까지(공유창 → X 앱), 컴퓨터면 글·링크만(X 웹 주소는 그림을 받지 못한다)
        if (await shareFile()) return;
        window.open(`https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(url)}`, "_blank", "noopener");
        return;
      case "insta":
      case "youtube": {
        const app = key === "insta" ? "인스타그램" : "유튜브";
        if (await shareFile()) return;
        if (saveImage()) setNote(`공유 이미지를 저장했어요. ${app}에서 이 이미지를 올려 주세요.`);
        else setNote("이미지를 만드는 중이에요. 잠시 뒤 다시 눌러 주세요.");
        return;
      }
    }
  }

  // 프로토타입 shareSheet(): 크림색 아래 시트 + 6개 아이콘. 공유 이미지 미리보기·저장은 owner 결정(2026-10-10)으로 유지.
  return (
    <BottomSheet open={open} onClose={onClose} labelledBy="share-title">
      <h3 id="share-title">결과 공유하기</h3>
      <p className="kicker">{props.nickname}님의 별 리포트를 나눠 보세요. 출생 정보는 공유되지 않아요.</p>
      <div className="share-grid">
        {SHARES.map((x) => (
          <button key={x.key} type="button" id={`share-${x.key}`} onClick={() => void share(x.key)}>
            <i style={{ background: x.bg }}>{x.icon}</i>
            {x.label}
          </button>
        ))}
      </div>
      {note && (
        <p role="status" className="muted" style={{ textAlign: "center" }}>
          {note}
        </p>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 만든 이미지(blob)라 next/image를 쓰지 않는다 */}
      {preview ? <img src={preview} alt={`공유 이미지 미리보기: ${props.sunSign} 그림과 소개`} className="mx-auto mt-2 max-h-[34vh] rounded-2xl" /> : <p className="muted">이미지를 만드는 중…</p>}
      <button type="button" className="btn block mt-3" disabled={!png} onClick={saveImage}>
        공유 이미지 저장하기
      </button>
      <p className="muted" style={{ fontSize: ".8rem", marginTop: 8 }}>
        이미지에는 닉네임·생년월일·태어난 곳이 들어가지 않아요.
      </p>
    </BottomSheet>
  );
}
