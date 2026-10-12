import { test } from "node:test";
import assert from "node:assert/strict";
import { REPORT_PRICE, reportPriceLabel, withReportPrice } from "./pricing.ts";

test("결제 팝업 버튼 금액은 실제 가격으로 채운다", () => {
  assert.equal(reportPriceLabel(), `${REPORT_PRICE.toLocaleString("ko-KR")}원`);
  assert.equal(withReportPrice("여기부터는 결제 후 · [2,900원으로 이어서 읽기]"), `여기부터는 결제 후 · [${reportPriceLabel()}으로 이어서 읽기]`);
  assert.equal(withReportPrice("금액 없는 문장"), "금액 없는 문장");
});
