"use client";

// 공유 시트(마스터스펙 6-1 화면 9). 공유 이미지(단순판 휠 + 유형 문구)를 기기 공유·저장하고, 사이트 주소를 복사한다.
// 결과 주소는 본인만 열 수 있어서 공유하지 않는다 — 사이트 첫 화면 주소만.
import { useEffect, useState } from "react";
import type { NatalChart } from "@/lib/astro/natal";
import { buildShareSvg, svgToPng } from "./shareImage";

const SITE_URL = "https://astro.ssolwellnesshouse.com";
const SHARE_TEXT = "출생차트로 나를 돌아보는 쏠 아스트로 하우스";

export default function ShareSheet(props: { chart: NatalChart; sunSign: string; sunSignIndex: number; typeLine: string; competency: string; style: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [png, setPng] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
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
    // props는 결과가 바뀌지 않는 한 같다 — 시트를 열 때 한 번 만든다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  const file = png ? new File([png], "ssol-astro.png", { type: "image/png" }) : null;
  const canShareFile = !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });

  async function shareImage() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: `${SHARE_TEXT} ${SITE_URL}` });
    } catch {
      /* 사용자가 공유를 취소 */
    }
  }

  function saveImage() {
    if (!png) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(png);
    a.download = "ssol-astro.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setNote("주소를 복사했어요.");
    } catch {
      setNote(SITE_URL);
    }
  }

  return (
    <>
      <button type="button" className="w-full rounded-full border border-gold px-6 py-3 text-gold" onClick={() => setOpen(true)}>
        결과 공유하기
      </button>
      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="결과 공유하기"
            className="flex w-full max-w-md flex-col gap-3 rounded-t-3xl bg-midnight px-4 pb-8 pt-4 text-cream"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-bold">결과 공유하기</p>
              <button type="button" className="text-sm underline" onClick={() => setOpen(false)}>
                닫기
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 만든 이미지(blob)라 next/image를 쓰지 않는다 */}
            {preview ? <img src={preview} alt="공유 이미지 미리보기: 출생차트와 유형 문구" className="mx-auto max-h-[50vh] rounded-2xl" /> : <p className="text-sm text-cream/70">이미지를 만드는 중…</p>}
            <p className="text-xs text-cream/70">이미지에는 닉네임·생년월일·태어난 곳이 들어가지 않아요.</p>
            {canShareFile && (
              <button type="button" className="w-full rounded-full bg-gold px-6 py-3 font-bold text-navy" onClick={() => void shareImage()}>
                이미지 공유하기
              </button>
            )}
            <button type="button" className="w-full rounded-full border border-cream/50 px-6 py-3 disabled:opacity-40" disabled={!png} onClick={saveImage}>
              이미지 저장하기
            </button>
            <button type="button" className="w-full rounded-full border border-cream/50 px-6 py-3" onClick={() => void copyLink()}>
              테스트 주소 복사하기
            </button>
            {note && <p className="text-center text-sm">{note}</p>}
          </div>
        </div>
      )}
    </>
  );
}
