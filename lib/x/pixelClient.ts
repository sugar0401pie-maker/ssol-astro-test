"use client";

// 브라우저에서 X 픽셀 전환 이벤트 보내기. 서버 전환 API와 같은 conversion_id(주문 번호)를 써서 X가 한 번만 센다.
import { isXEventId } from "./events";

export function xPixelEvent(eventId: string | null, params: { conversion_id: string; value?: number; currency?: string; contents?: Array<Record<string, string | number>> }): void {
  if (typeof window === "undefined" || !isXEventId(eventId)) return;
  const twq = (window as unknown as { twq?: (...a: unknown[]) => void }).twq;
  if (typeof twq !== "function") return;
  twq("event", eventId, params);
}
