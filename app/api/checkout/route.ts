import { NextRequest, NextResponse } from "next/server";
import { resolveOwner } from "@/lib/results/owner";
import { REPORT_ORDER_NAME, REPORT_PRICE } from "@/lib/billing/pricing";
import { createOrder, getPayState, isUuid } from "@/lib/results/store";
import { recordConsents } from "@/lib/results/consentLog";
import { WITHDRAWAL_NOTICE_VERSION } from "@/lib/billing/withdrawal";
import { sanitizeTouch } from "@/lib/attribution/attribution";
import { PAY_BUTTON_TERMS_VERSION } from "@/lib/billing/kakaopay";

// 결제 주문 만들기(로그인 또는 비회원 열쇠): 내 결과인지·아직 결제 전인지 확인하고, 금액은 서버가 정한다. 돌려준 orderId로 토스 결제창을 연다.
export const runtime = "nodejs";

/** 토스 결제위젯의 비회원 결제 고객 키(SDK의 ANONYMOUS와 같은 값) — 비회원 결과는 로그인 없이 결제할 수 있다. */
const TOSS_ANONYMOUS = "@@ANONYMOUS";

export async function POST(req: NextRequest) {
  const owner = await resolveOwner(req.headers);
  if (!owner) return NextResponse.json({ error: "결과를 찾을 수 없어요. 처음부터 다시 시도해 주세요." }, { status: 401 });
  let body: { resultId?: unknown; withdrawalAck?: unknown; attributionLast?: unknown; consentVersion?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const resultId = typeof body.resultId === "string" ? body.resultId : "";
  if (!isUuid(resultId)) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
  // 청약철회 제한은 사전 고지 + 동의가 있어야 한다(약관 제13조 2항). 화면에서 체크해도 서버가 한 번 더 확인한다.
  if (body.withdrawalAck !== true) return NextResponse.json({ error: "청약철회 안내에 동의해 주세요.", needAck: true }, { status: 400 });
  try {
    const state = await getPayState(owner, resultId);
    if (!state) return NextResponse.json({ error: "결과를 찾을 수 없어요." }, { status: 404 });
    if (state.paid) return NextResponse.json({ error: "이미 결제한 리포트예요.", paid: true }, { status: 409 });
    // 카카오페이 버튼(체크 칸 없이 버튼 아래 안내 문구, owner 2026-11-18)이면 그 문구 판, 아니면 토스 결제 화면의 체크 문구 판
    const version = body.consentVersion === PAY_BUTTON_TERMS_VERSION ? PAY_BUTTON_TERMS_VERSION : WITHDRAWAL_NOTICE_VERSION;
    const orderId = await createOrder(owner, resultId, REPORT_PRICE, version, sanitizeTouch(body.attributionLast));
    await recordConsents(owner, ["withdrawal_limit"], version, { resultId, orderId });
    return NextResponse.json({ orderId, orderName: REPORT_ORDER_NAME, amount: REPORT_PRICE, customerKey: owner.kind === "user" ? owner.userId : TOSS_ANONYMOUS });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "주문 생성 실패");
    return NextResponse.json({ error: "주문을 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
