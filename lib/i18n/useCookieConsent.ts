"use client";

// 쿠키 동의 값을 화면에서 읽는 훅 — 동의를 바꾸면(같은 탭 saveChoice) 바로 다시 그린다.
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { CC_EVENT, allowedOn, gpcOn, readChoice } from "./cookieConsent";

function subscribe(cb: () => void) {
  window.addEventListener(CC_EVENT, cb);
  return () => window.removeEventListener(CC_EVENT, cb);
}
const snapshot = () => document.cookie;
// 서버에서 그릴 때는 '아직 모름' — 영문 화면은 꺼진 쪽(동의 전 불러오지 않음)
const serverSnapshot = () => "";

export function useConsentAllowed(kind: "analytics" | "ads"): boolean {
  const pathname = usePathname() ?? "/";
  const cookie = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  void cookie;
  return allowedOn(kind, pathname, typeof window === "undefined" ? null : readChoice(), typeof window === "undefined" ? false : gpcOn());
}
