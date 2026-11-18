import { NextRequest, NextResponse } from "next/server";
import { resolveOwner } from "@/lib/results/owner";
import { getOrder, isResultPaid, ownsOrder, setOrderPaymentKey, settleOrder } from "@/lib/results/store";
import { REPORT_ORDER_NAME } from "@/lib/billing/pricing";
import { KAKAOPAY_METHOD, kakaoReturnOrigin, kakaopayEnabled, pickKakaoRedirect } from "@/lib/billing/kakaopay";
import { kakaoReady, kakaoUserRef } from "@/lib/billing/kakaopayApi";
import { clampPage } from "@/lib/results/lastPage";
import { KO_SITE } from "@/lib/site";

// 카카오페이 결제 준비(owner 2026-11-18): 이미 만든 내 주문(로그인 또는 비회원 열쇠)으로 카카오페이 결제를 준비하고 결제창 주소를 돌려준다.
export const runtime = "nodejs";
const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function POST(req: NextRequest) {
  if (!kakaopayEnabled()) return NextResponse.json({ error: "카카오페이 결제가 아직 준비되지 않았어요." }, { status: 503 });
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "결과를 찾을 수 없어요. 처음부터 다시 시도해 주세요." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { orderId?: unknown; page?: unknown };
  const orderId = typeof body.orderId === "string" && UUID_RE.test(body.orderId) ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "결제 정보가 올바르지 않아요." }, { status: 400 });
  try {
    const order = await getOrder(orderId);
    if (!order || !ownsOrder(owner, order)) return NextResponse.json({ error: "주문 정보를 찾을 수 없어요." }, { status: 404 });
    if (order.status !== "pending") return NextResponse.json({ error: "이미 처리된 주문이에요." }, { status: 409 });
    if (order.currency === "USD") return NextResponse.json({ error: "카카오페이는 원화 결제만 돼요." }, { status: 400 });
    if (order.result_id && (await isResultPaid(order.result_id))) {
      await settleOrder(orderId, "canceled");
      return NextResponse.json({ error: "이미 결제한 리포트예요.", paid: true }, { status: 409 });
    }
    const page = clampPage(String(body.page ?? "4"));
    const o = kakaoReturnOrigin(new URL(req.url).origin, KO_SITE);
    const back = `resultId=${order.result_id}&page=${page}`;
    const r = await kakaoReady({
      orderId,
      userRef: kakaoUserRef(order),
      itemName: REPORT_ORDER_NAME,
      amount: order.amount,
      approvalUrl: `${o}/checkout/kakaopay?orderId=${orderId}&${back}`,
      cancelUrl: `${o}/checkout/fail?${back}&code=KAKAOPAY_CANCEL`,
      failUrl: `${o}/checkout/fail?${back}&code=KAKAOPAY_FAIL`,
    });
    if (!r.ok) {
      console.warn("카카오페이 준비 실패:", { code: r.code, network: r.network }); // 키·금액·사용자 정보는 남기지 않음
      return NextResponse.json({ error: `카카오페이 결제를 시작하지 못했어요. ${r.message}${r.code ? ` (오류 코드 ${r.code})` : ""}` }, { status: 502 });
    }
    const redirectUrl = pickKakaoRedirect(req.headers.get("user-agent") ?? "", r.body);
    if (!r.body.tid || !redirectUrl) return NextResponse.json({ error: "카카오페이 결제를 시작하지 못했어요." }, { status: 502 });
    await setOrderPaymentKey(orderId, r.body.tid, KAKAOPAY_METHOD);
    return NextResponse.json({ redirectUrl });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "카카오페이 준비 처리 실패");
    return NextResponse.json({ error: "결제를 시작하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
