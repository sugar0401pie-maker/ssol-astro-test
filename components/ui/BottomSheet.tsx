"use client";

// 아래에서 올라오는 시트(프로토타입 .sheet / .sheet-back 그대로): 크림색, 잡는 막대, 둥근 × 버튼, 어두운 뒤 배경,
// Esc로 닫기, 시트 안에서만 Tab이 돌고, 닫으면 연 버튼으로 초점이 돌아간다.
import { useEffect, useRef, useState } from "react";

export default function BottomSheet({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const back = useRef<Element | null>(null);
  // 부모가 다시 그려질 때마다 새 onClose가 와도 열고 닫는 효과가 다시 돌지 않게(다시 돌면 올라오는 애니메이션이 끝나지 않는다)
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    back.current = document.activeElement;
    const r = requestAnimationFrame(() => setOn(true));
    const t = setTimeout(() => sheet.current?.querySelector<HTMLButtonElement>(".x")?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && sheet.current) {
        const f = sheet.current.querySelectorAll<HTMLElement>('button,[href],[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      setOn(false);
      (back.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div className={`sheet-back${on ? " on" : ""}`} onClick={onClose} />
      <div ref={sheet} className={`sheet${on ? " on" : ""}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="grab" aria-hidden="true" />
        <button className="x" type="button" aria-label="닫기" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </>
  );
}
