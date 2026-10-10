"use client";

// 화면 고정 문구(/api/copy: A15 일부 + B14 오류·빈 화면·로딩 문구)를 한 번만 받아 여러 화면이 함께 쓴다.
// 못 받아 와도 화면은 각자의 기본 문구로 그대로 동작한다(문구만 빠짐).
import { useEffect, useState } from "react";

export interface B14Row {
  title: string;
  body: string;
  button: string;
  alt: string;
}
export interface ScreenCopy {
  FIX_LOADING?: string;
  FIX_PRIVACY_NOTE?: string;
  B14?: Record<string, B14Row>;
}

let cache: ScreenCopy | null = null;
let pending: Promise<ScreenCopy> | null = null;

function load(): Promise<ScreenCopy> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch("/api/copy")
    .then((r) => (r.ok ? (r.json() as Promise<ScreenCopy>) : {}))
    .then((c) => (cache = c))
    .catch(() => {
      pending = null;
      return {};
    });
  return pending;
}

export function useCopy(): ScreenCopy {
  const [copy, setCopy] = useState<ScreenCopy>(cache ?? {});
  useEffect(() => {
    let alive = true;
    void load().then((c) => alive && setCopy(c));
    return () => {
      alive = false;
    };
  }, []);
  return copy;
}

/** B14 한 칸({닉네임} 채움). 없으면 fallback. */
export function b14(copy: ScreenCopy, id: string, field: keyof B14Row, fallback: string, nickname = ""): string {
  const t = copy.B14?.[id]?.[field];
  return t ? t.replaceAll("{닉네임}", nickname) : fallback;
}
