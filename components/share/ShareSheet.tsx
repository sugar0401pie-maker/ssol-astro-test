"use client";

// 공유 시트(마스터스펙 6-1 화면 9, 2026-10-09 프로토타입 shareSheet): 카카오톡 · 링크 복사 · 네이버 블로그 · X(트위터) · 인스타그램 · 유튜브.
// 결과 주소는 본인만 열 수 있어서 공유하지 않는다 — 사이트 첫 화면 주소와, 출생 정보가 없는 공유 이미지(단순판 휠 + 유형 문구)만.
// 카카오톡은 기기 공유창(그 안의 카카오톡)으로 보낸다 — 카카오 SDK 앱 키 없이 되는 방법. 공유창이 없으면 주소를 복사해 안내.
// 인스타그램·유튜브는 웹에서 바로 올리는 주소가 없어, 공유 이미지를 기기 공유창으로 넘기거나 저장한 뒤 앱에서 올리도록 안내한다.
import { useEffect, useState } from "react";
import type { NatalChart } from "@/lib/astro/natal";
import { BRAND_PATHS } from "./brandIcons";
import { buildShareSvg, svgToPng } from "./shareImage";

export const SITE_URL = "https://astro.ssolwellnesshouse.com";
const SHARE_TEXT = "출생차트로 나를 돌아보는 쏠 아스트로 하우스";

export interface ShareProps {
  chart: NatalChart;
  sunSign: string;
  sunSignIndex: number;
  typeLine: string;
  competency: string;
  style: string;
  nickname: string;
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
const SHARES: Array<{ key: ShareKey; label: string; bg: string; icon: React.ReactNode }> = [
  { key: "kakao", label: "카카오톡", bg: "#FEE500", icon: brand("kakaotalk", "#191919", 28) },
  { key: "link", label: "링크 복사", bg: "#E9E3D6", icon: LINK_ICON },
  { key: "blog", label: "네이버 블로그", bg: "#03C75A", icon: brand("naver", "#fff", 20) },
  { key: "x", label: "X(트위터)", bg: "#000", icon: brand("x", "#fff", 20) },
  { key: "insta", label: "인스타그램", bg: "linear-gradient(45deg,#F58529,#DD2A7B 45%,#8134AF 75%,#515BD4)", icon: brand("instagram", "#fff", 24) },
  { key: "youtube", label: "유튜브", bg: "#FF0000", icon: brand("youtube", "#fff", 24) },
];

export default function ShareSheet({ open, onClose, ...props }: ShareProps & { open: boolean; onClose: () => void }) {
  const [note, setNote] = useState<string | null>(null);
  const [png, setPng] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open || png) return;
    let alive = true;
    const { svg, texts } = buildShareSvg(props);
    void svgToPng(svg, texts).then((b) => {
      if (!alive) return;
      setPng(b);
      setPreview(b ? URL.createObjectURL(b) : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const file = png ? new File([png], "ssol-astro.png", { type: "image/png" }) : null;
  const canShareFile = !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });

  async function copyLink(msg = "링크를 복사했어요") {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setNote(msg);
    } catch {
      setNote(`복사가 막혀 있어요. 이 주소를 복사해 주세요: ${SITE_URL}`);
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
    const enc = encodeURIComponent;
    switch (key) {
      case "link":
        return copyLink();
      case "kakao":
        if (navigator.share) {
          try {
            await navigator.share({ title: "쏠 아스트로 하우스", text: SHARE_TEXT, url: SITE_URL });
          } catch {
            /* 사용자가 공유를 취소 */
          }
          return;
        }
        return copyLink("링크를 복사했어요. 카카오톡 대화창에 붙여 넣어 보내 주세요.");
      case "blog":
        window.open(`https://share.naver.com/web/shareView?url=${enc(SITE_URL)}&title=${enc(SHARE_TEXT)}`, "_blank", "noopener");
        return;
      case "x":
        window.open(`https://twitter.com/intent/tweet?text=${enc(SHARE_TEXT)}&url=${enc(SITE_URL)}`, "_blank", "noopener");
        return;
      case "insta":
      case "youtube": {
        const app = key === "insta" ? "인스타그램" : "유튜브";
        if (canShareFile && file) {
          try {
            await navigator.share({ files: [file], text: `${SHARE_TEXT} ${SITE_URL}` });
          } catch {
            /* 취소 */
          }
          return;
        }
        if (saveImage()) setNote(`공유 이미지를 저장했어요. ${app}에서 이 이미지를 올려 주세요.`);
        else setNote("이미지를 만드는 중이에요. 잠시 뒤 다시 눌러 주세요.");
        return;
      }
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-auto rounded-t-3xl bg-midnight px-4 pb-8 pt-4 text-cream"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="share-title" className="text-lg font-bold">결과 공유하기</h3>
          <button type="button" className="text-sm underline" onClick={onClose}>
            닫기
          </button>
        </div>
        <p className="text-sm text-cream/80">{props.nickname}님의 별 리포트를 나눠 보세요. 출생 정보는 공유되지 않아요.</p>
        <div className="grid grid-cols-3 gap-3">
          {SHARES.map((x) => (
            <button key={x.key} type="button" onClick={() => void share(x.key)} className="flex flex-col items-center gap-1.5 text-xs">
              <i className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: x.bg }}>
                {x.icon}
              </i>
              {x.label}
            </button>
          ))}
        </div>
        {note && <p role="status" className="rounded-xl bg-cream px-3 py-2 text-center text-sm text-navy">{note}</p>}
        {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 만든 이미지(blob)라 next/image를 쓰지 않는다 */}
        {preview ? <img src={preview} alt="공유 이미지 미리보기: 출생차트와 유형 문구" className="mx-auto max-h-[40vh] rounded-2xl" /> : <p className="text-sm text-cream/70">이미지를 만드는 중…</p>}
        <button type="button" className="w-full rounded-full border border-cream/50 px-6 py-3 disabled:opacity-40" disabled={!png} onClick={saveImage}>
          공유 이미지 저장하기
        </button>
        <p className="text-xs text-cream/70">이미지에는 닉네임·생년월일·태어난 곳이 들어가지 않아요.</p>
      </div>
    </div>
  );
}
