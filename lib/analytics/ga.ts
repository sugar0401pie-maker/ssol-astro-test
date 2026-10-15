// GA4(구글 애널리틱스) 이벤트 정하기 — owner 요청 2026-10-15 "채널별 방문 → 테스트 시작 → 무료 결과 → 결제 전환율".
// 순수 함수(테스트 있음). 우리 이용 흐름 기록(track) 이벤트를 GA4 이벤트 이름으로 바꾸고, 보낼 값은 장 번호·금액뿐이다.
// 생년월일·출생 시간·도시·닉네임·답·결과 id 같은 값은 GA4로 절대 보내지 않는다(이벤트가 일어났다는 사실만).
import type { FunnelEvent } from "./events";

/** GA4 측정 ID 형식(G-로 시작). 형식이 아니면 GA를 켜지 않는다. */
export function isGaId(v: string | undefined | null): v is string {
  return typeof v === "string" && /^G-[A-Z0-9]{4,20}$/.test(v);
}

export interface GaEvent {
  name: "test_start" | "birth_info_submit" | "free_result_view" | "paid_click";
  params: Record<string, string | number>;
}

/**
 * 우리 이벤트 → GA4 이벤트(없으면 null).
 * test_start = 생년월일 입력 화면에 들어옴(앞 화면 '경험' 완료), birth_info_submit = 생년월일·시간·도시 입력 완료,
 * free_result_view = 무료 결과 1~3장, paid_click = 결제 화면을 엶(유료 버튼을 누름). purchase는 결제 완료 화면이 따로 보낸다.
 */
export function gaEventFor(event: FunnelEvent, props: Record<string, string | number>, price: number): GaEvent | null {
  switch (event) {
    case "experience_done":
      return { name: "test_start", params: {} };
    case "birth_done":
      return { name: "birth_info_submit", params: {} };
    case "result_view":
      return typeof props.page === "number" && props.page >= 1 && props.page <= 3 ? { name: "free_result_view", params: { page: props.page } } : null;
    case "pay_click":
      return { name: "paid_click", params: { currency: "KRW", value: price } };
    default:
      return null;
  }
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const KEEP_QUERY = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/**
 * GA4로 보낼 페이지 주소: 결과·주문 id는 ':id'로 가리고, 쿼리는 utm 값만 남긴다
 * (결제 완료 주소의 paymentKey·orderId, 로그인 next 같은 값은 보내지 않음).
 */
export function gaPageLocation(origin: string, pathname: string, search: string): { location: string; path: string } {
  const path = pathname.replace(UUID, ":id");
  const q = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const k of KEEP_QUERY) {
    const v = q.get(k);
    if (v) kept.set(k, v.slice(0, 100));
  }
  const qs = kept.toString();
  return { location: `${origin}${path}${qs ? `?${qs}` : ""}`, path };
}
