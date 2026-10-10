"use client";

// 화면 아래 짧은 알림(프로토타입 .toast — 2.2초)
import { useEffect, useState } from "react";

export function useToast(): [string, (msg: string) => void] {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, setMsg];
}

export default function Toast({ msg }: { msg: string }) {
  return (
    <div className={`toast${msg ? " on" : ""}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
}
