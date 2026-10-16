// X 전환 API 요청 본문 만들기(순수 함수, 테스트 있음). 실제 전송은 서버 전용 lib/x/sendConversion.ts.
// 식별자는 하나 이상 필요: twclid / hashed_email / hashed_phone_number / ip_address+user_agent(둘 다).
import { createHash } from "node:crypto";

export interface XIdentifiers {
  twclid?: string | null;
  email?: string | null;
  phone?: string | null; // E.164 형식으로 바꿀 수 있는 번호(한국 010-1234-5678도 받음)
  ipAddress?: string | null;
  userAgent?: string | null;
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** 이메일: 앞뒤 공백 제거·소문자 → SHA-256(hex) */
export function hashEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? sha256(e) : null;
}

/** 전화번호를 E.164로(한국 번호는 0으로 시작하면 +82). 못 바꾸면 null */
export function toE164(phone: string): string | null {
  const raw = phone.trim();
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (raw.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.startsWith("0") && digits.length >= 9 && digits.length <= 11) return `+82${digits.slice(1)}`;
  if (digits.startsWith("82") && digits.length >= 10 && digits.length <= 13) return `+${digits}`;
  return null;
}

export function hashPhone(phone: string): string | null {
  const e = toE164(phone);
  return e ? sha256(e) : null;
}

/** 식별자 묶음(없으면 null — 그 전환은 보내지 않는다). ip와 user_agent는 둘 다 있을 때만. */
export function buildIdentifiers(ids: XIdentifiers): Record<string, string> | null {
  const out: Record<string, string> = {};
  if (ids.twclid) out.twclid = ids.twclid;
  const he = ids.email ? hashEmail(ids.email) : null;
  if (he) out.hashed_email = he;
  const hp = ids.phone ? hashPhone(ids.phone) : null;
  if (hp) out.hashed_phone_number = hp;
  if (ids.ipAddress && ids.userAgent) {
    out.ip_address = ids.ipAddress;
    out.user_agent = ids.userAgent.slice(0, 512);
  }
  return Object.keys(out).length ? out : null;
}

export function buildConversionBody(c: {
  eventId: string;
  conversionTime: Date;
  conversionId?: string;
  eventSourceUrl?: string;
  identifiers: Record<string, string>;
  value?: number;
  currency?: string;
}): { conversions: Array<Record<string, unknown>> } {
  const conv: Record<string, unknown> = {
    conversion_time: c.conversionTime.toISOString(),
    event_id: c.eventId,
    identifiers: [c.identifiers],
  };
  if (c.eventSourceUrl) conv.event_source_url = c.eventSourceUrl;
  if (c.conversionId) conv.conversion_id = c.conversionId;
  if (typeof c.value === "number") conv.value = String(c.value);
  if (c.currency) conv.price_currency = c.currency;
  return { conversions: [conv] };
}

/** 요청 헤더에서 첫 번째 클라이언트 IP(x-forwarded-for → x-real-ip) */
export function clientIp(headers: { get(name: string): string | null }): string | null {
  const xff = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = xff || headers.get("x-real-ip")?.trim() || "";
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}
