"use client";

// 영문 테스트 진행 상태(이 탭 sessionStorage — 탭을 닫으면 사라짐). 화면마다 주소가 따로라(/en/start → experience → first-time →
// birth → /en/questions) 단계 사이에 닉네임·처음 여부·출생 정보를 넘긴다. 새로고침해도 이어 간다.
import { useSyncExternalStore } from "react";

export const EN_PROGRESS_KEY = "astro_en_progress_v1";
const EVT = "astro-en-progress";

export interface EnProgress {
  nickname?: string;
  firstTime?: boolean;
  birth?: Record<string, unknown>;
  cityLabel?: string;
  consent?: { version: string; terms: boolean; birth: boolean };
}

const raw = () => {
  try {
    return sessionStorage.getItem(EN_PROGRESS_KEY);
  } catch {
    return null;
  }
};
export function parseEnProgress(v: string | null): EnProgress | null {
  try {
    const p = JSON.parse(v ?? "null");
    return p && typeof p === "object" ? (p as EnProgress) : null;
  } catch {
    return null;
  }
}
export function readEnProgress(): EnProgress | null {
  return parseEnProgress(raw());
}
/** 지금 값에 덧붙여 저장 */
export function saveEnProgress(patch: EnProgress): void {
  try {
    sessionStorage.setItem(EN_PROGRESS_KEY, JSON.stringify({ ...(readEnProgress() ?? {}), ...patch }));
    window.dispatchEvent(new Event(EVT));
  } catch {
    /* 비공개 창 등 — 화면 상태로만 진행 */
  }
}
export function clearEnProgress(): void {
  try {
    sessionStorage.removeItem(EN_PROGRESS_KEY);
  } catch {
    /* 무시 */
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  return () => window.removeEventListener(EVT, cb);
}

/** 서버에서 그릴 때는 undefined(아직 모름), 브라우저에서는 진행 상태(없으면 null) — 원문 문자열을 비교해 다시 그리기를 줄인다 */
export function useEnProgressRaw(): string | null | undefined {
  return useSyncExternalStore(subscribe, raw, () => undefined);
}
