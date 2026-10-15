"use client";

// GA4 보내기(브라우저). 측정 ID(NEXT_PUBLIC_GA_ID)가 없거나 GA가 막혀 있으면 아무것도 하지 않는다 — 화면 동작과 무관.
import { gaEventFor, gaPageLocation, isGaId } from "./ga";
import type { FunnelEvent } from "./events";
import { REPORT_PRICE } from "@/lib/billing/pricing";

export const GA_ID = isGaId(process.env.NEXT_PUBLIC_GA_ID) ? process.env.NEXT_PUBLIC_GA_ID : null;

type Gtag = (...args: unknown[]) => void;
let ready = false;

/**
 * gtag 준비: 스크립트(gtag.js)가 늦게 와도 이벤트가 사라지지 않게 dataLayer에 먼저 쌓고, 'config'는 맨 처음 한 번.
 * 첫 페이지 보기(utm이 담긴 주소)가 스크립트보다 먼저 일어나도 순서대로 보내진다.
 */
function gtag(): Gtag | null {
  if (!GA_ID || typeof window === "undefined") return null;
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
  if (!ready) {
    w.dataLayer = w.dataLayer ?? [];
    // gtag.js는 arguments 객체 그대로를 받는다(배열로 바꾸면 무시됨)
    // eslint-disable-next-line prefer-rest-params
    w.gtag = w.gtag ?? function gtagStub() { w.dataLayer!.push(arguments); };
    w.gtag("js", new Date());
    w.gtag("config", GA_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    ready = true;
  }
  return w.gtag!;
}

const sentFree = new Set<string>();

/** 우리 이벤트를 GA4 이벤트로(정해 둔 다섯 가지만). 무료 결과는 이 페이지에서 한 번만. */
export function gaFromFunnel(event: FunnelEvent, props: Record<string, string | number>): void {
  const g = gtag();
  if (!g) return;
  const ev = gaEventFor(event, props, REPORT_PRICE);
  if (!ev) return;
  if (ev.name === "free_result_view") {
    if (sentFree.has(location.pathname.split("/").slice(0, 3).join("/"))) return;
    sentFree.add(location.pathname.split("/").slice(0, 3).join("/"));
  }
  g("event", ev.name, ev.params);
}

/** 결제 완료(GA4 표준 purchase). transaction_id = 주문 번호(무작위 값) — 같은 주문을 두 번 세지 않게. */
export function gaPurchase(orderId: string, amount: number): void {
  const g = gtag();
  if (!g) return;
  g("event", "purchase", {
    transaction_id: orderId,
    currency: "KRW",
    value: amount,
    items: [{ item_id: "astro_report", item_name: "쏠 아스트로 하우스 전체 리포트", price: amount, quantity: 1 }],
  });
}

/** 페이지 보기(주소의 id는 가리고 쿼리는 utm만) */
export function gaPageView(): void {
  const g = gtag();
  if (!g) return;
  const { location: page_location, path: page_path } = gaPageLocation(window.location.origin, window.location.pathname, window.location.search);
  g("event", "page_view", { page_location, page_path, page_title: document.title });
}
