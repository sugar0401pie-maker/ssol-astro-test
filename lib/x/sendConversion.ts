import "server-only";
// X 전환 API로 전환 보내기(서버 전용). 토큰은 환경변수 X_PIXEL_TOKEN에서만 읽고, 로그에는 토큰·식별자를 남기지 않는다.
// 토큰이나 이벤트 ID가 없으면 조용히 건너뛰고, 실패해도 결제·리포트 흐름에는 영향을 주지 않는다.
import { buildConversionBody, buildIdentifiers, type XIdentifiers } from "./conversion";
import { isXEventId, X_PIXEL_ID } from "./events";

const ENDPOINT = `https://ads-api.x.com/12/measurement/conversions/${X_PIXEL_ID}`;

export async function sendXConversion(c: {
  eventId: string | null;
  conversionId?: string;
  eventSourceUrl?: string;
  ids: XIdentifiers;
  value?: number;
  currency?: string;
}): Promise<"sent" | "skipped" | "failed"> {
  const token = process.env.X_PIXEL_TOKEN;
  if (!token || !isXEventId(c.eventId)) return "skipped";
  const identifiers = buildIdentifiers(c.ids);
  if (!identifiers) return "skipped";
  const body = buildConversionBody({ eventId: c.eventId, conversionTime: new Date(), conversionId: c.conversionId, eventSourceUrl: c.eventSourceUrl, identifiers, value: c.value, currency: c.currency });
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "X-Pixel-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn("X 전환 전송 실패:", res.status);
      return "failed";
    }
    return "sent";
  } catch {
    console.warn("X 전환 전송 실패: 네트워크");
    return "failed";
  }
}
