"use client";

// 유입 경로 모으기(브라우저). 사이트를 처음 열 때 한 번 읽어 이 기기(localStorage 'ssol_attr')에 둔다.
// 결과 저장·결제·이용 흐름 기록이 이 값을 함께 보낸다. 저장소를 못 쓰면 이 탭에서만 기억(실패해도 화면은 그대로).
import { mergeTouch, readTouch, sanitizeAttribution, type Attribution } from "./attribution";

const KEY = "ssol_attr";
let memory: Attribution | null = null;
let captured = false;

export function captureAttribution(): void {
  if (typeof window === "undefined" || captured) return;
  captured = true;
  try {
    const now = new Date();
    const cur = readTouch({
      search: window.location.search,
      pathname: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      ownHost: window.location.hostname,
      now,
    });
    const next = mergeTouch(getAttribution(), cur, now);
    memory = next;
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 저장소를 못 쓰는 환경 — memory만 */
  }
}

export function getAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitizeAttribution(JSON.parse(raw)) ?? memory;
  } catch {
    /* 무시 */
  }
  return memory;
}
