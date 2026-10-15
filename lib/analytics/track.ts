"use client";

// 이용 흐름 기록 보내기(브라우저). 실패해도 조용히 넘어간다 — 화면 동작에 영향을 주지 않는다.
// anonId는 이 브라우저의 무작위 값(이름·연락처와 무관)이라 로그인 전후 흐름을 이어 볼 수 있게만 쓴다.
import { getRealSession } from "@/lib/supabase/browser";
import type { FunnelEvent } from "./events";
import { attributionProps } from "@/lib/attribution/attribution";
import { captureAttribution, getAttribution } from "@/lib/attribution/client";

const KEY = "astro_anon_v1";
let memoryId: string | null = null;

function anonId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    memoryId ??= crypto.randomUUID().replace(/-/g, "");
    return memoryId;
  }
}

const sentOnce = new Set<string>();

/** 한 번 보낸다. once를 주면 같은 키로는 이 페이지에서 한 번만(예: 같은 장을 여러 번 그려도 한 번). */
export function track(event: FunnelEvent, props: Record<string, string | number> = {}, once?: string): void {
  if (typeof window === "undefined") return;
  if (once) {
    if (sentOnce.has(once)) return;
    sentOnce.add(once);
  }
  // 이번 방문의 유입 경로(utm·공유 코드 등 짧은 값)를 함께 남긴다 — 화면이 첫 기록보다 먼저 이벤트를 보내도 빠지지 않게 여기서도 읽는다
  captureAttribution();
  const withSource = { ...attributionProps(getAttribution()?.last), ...props };
  void (async () => {
    try {
      const session = await getRealSession().catch(() => null);
      await fetch("/api/events", {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json", ...(session ? { authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ event, props: withSource, anonId: anonId() }),
      });
    } catch {
      /* 무시 */
    }
  })();
}
