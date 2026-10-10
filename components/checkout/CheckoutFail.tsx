"use client";

// 결제 실패·취소(해석 DB B14 ERR_PAY_FAIL·ERR_PAY_CANCEL). 토스가 돌려준 code가 사용자 취소면 '취소' 문구.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { b14, useCopy } from "@/lib/copy/useCopy";

const CANCEL_CODES = new Set(["PAY_PROCESS_CANCELED", "USER_CANCEL"]);

export default function CheckoutFail() {
  const params = useSearchParams();
  const copy = useCopy();
  const resultId = params.get("resultId");
  const id = CANCEL_CODES.has(params.get("code") ?? "") ? "ERR_PAY_CANCEL" : "ERR_PAY_FAIL";
  const cancel = id === "ERR_PAY_CANCEL";
  return (
    <div className="flex flex-col gap-4 text-cream">
      <h1 className="big">{b14(copy, id, "title", cancel ? "결제를 멈췄어요" : "결제가 완료되지 않았어요")}</h1>
      <p className="small">{b14(copy, id, "body", cancel ? "지금까지 본 결과는 그대로 남아 있어요." : "결제 금액은 청구되지 않았어요. 다시 시도하실 수 있어요.")}</p>
      {resultId && !cancel && (
        <Link href={`/checkout/${resultId}`} className="btn block">
          {b14(copy, id, "button", "다시 결제하기")}
        </Link>
      )}
      <Link href={resultId ? `/results/${resultId}` : "/results"} className={cancel ? "btn block" : "linkish text-center"}>
        결과로 돌아가기
      </Link>
      {resultId && cancel && (
        <Link href={`/checkout/${resultId}`} className="linkish text-center">
          다시 결제하기
        </Link>
      )}
    </div>
  );
}
