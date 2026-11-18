"use client";

// 카카오페이 바로 결제(owner 2026-11-18, 쏠 타로 하우스와 같은 흐름): 주문 만들기 → 서버 카카오페이 준비 → 카카오페이 결제창으로 이동.
// 로그인 없이도 된다(비회원 열쇠로 주문 — 원래 결제와 같음). 금액은 서버가 정한다.
import type { Session } from "@supabase/supabase-js";
import { apiHeaders } from "@/lib/guest/client";
import { getAttribution } from "@/lib/attribution/client";
import { PAY_BUTTON_TERMS_VERSION } from "./kakaopay";

export class PayStartError extends Error {
  constructor(message: string, readonly paid = false) {
    super(message);
  }
}

async function post<T>(url: string, session: Session | null, body: object): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: apiHeaders(session, { "content-type": "application/json" }), body: JSON.stringify(body) });
  const d = (await res.json().catch(() => ({}))) as T & { error?: string; paid?: boolean };
  if (!res.ok) throw new PayStartError(d.error ?? "결제를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.", res.status === 409 && !!d.paid);
  return d;
}

/** 성공하면 카카오페이로 이동(돌아오지 않음). 오류는 PayStartError로 던진다(paid면 이미 결제된 결과). */
export async function startKakaoPay(resultId: string, page: number, session: Session | null, opts: { replace?: boolean } = {}): Promise<void> {
  const o = await post<{ orderId: string }>("/api/checkout", session, {
    resultId,
    withdrawalAck: true,
    consentVersion: PAY_BUTTON_TERMS_VERSION,
    attributionLast: getAttribution()?.last ?? null,
  });
  const r = await post<{ redirectUrl: string }>("/api/checkout/kakaopay/ready", session, { orderId: o.orderId, page });
  if (opts.replace) window.location.replace(r.redirectUrl);
  else window.location.assign(r.redirectUrl);
}

let cached: Promise<boolean> | null = null;
/** 카카오페이가 켜져 있는지(서버 설정 — 키 값은 안 받음). 못 물어보면 false(예전 토스 결제). */
export function kakaopayOn(): Promise<boolean> {
  cached ??= fetch("/api/checkout/config", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { kakaopay: false }))
    .then((d: { kakaopay?: boolean }) => d.kakaopay === true)
    .catch(() => false);
  return cached;
}
