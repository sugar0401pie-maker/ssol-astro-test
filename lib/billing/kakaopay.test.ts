import { test } from "node:test";
import assert from "node:assert/strict";
import { decideAfterKakaoApproveFailure, kakaoReturnOrigin, kakaopayEnabled, pickKakaoRedirect } from "./kakaopay.ts";

test("CID·Secret key 둘 다 있을 때만 켠다", () => {
  assert.equal(kakaopayEnabled({}), false);
  assert.equal(kakaopayEnabled({ KAKAOPAY_CID: "TC0ONETIME" }), false);
  assert.equal(kakaopayEnabled({ KAKAOPAY_CID: "TC0ONETIME", KAKAOPAY_SECRET_KEY: " " }), false);
  assert.equal(kakaopayEnabled({ KAKAOPAY_CID: "TC0ONETIME", KAKAOPAY_SECRET_KEY: "k" }), true);
});

test("휴대폰은 모바일 주소, PC는 PC 주소, https만", () => {
  const r = { next_redirect_mobile_url: "https://m.kakao/x", next_redirect_pc_url: "https://pc.kakao/x" };
  assert.equal(pickKakaoRedirect("Mozilla (iPhone)", r), "https://m.kakao/x");
  assert.equal(pickKakaoRedirect("Mozilla (Windows NT)", r), "https://pc.kakao/x");
  assert.equal(pickKakaoRedirect("iPhone", { next_redirect_mobile_url: "http://evil" }), null);
});

test("돌아올 주소는 우리 사이트만", () => {
  const fb = "https://astro.ssolwellnesshouse.com";
  assert.equal(kakaoReturnOrigin("https://astro.ssolwellnesshouse.com", fb), fb);
  assert.equal(kakaoReturnOrigin("https://x-git-main.vercel.app", fb), "https://x-git-main.vercel.app");
  assert.equal(kakaoReturnOrigin("http://localhost:3200", fb), "http://localhost:3200");
  assert.equal(kakaoReturnOrigin("https://evil.com", fb), fb);
  assert.equal(kakaoReturnOrigin(null, fb), fb);
});

test("승인 실패 뒤 판단: 돈이 나갔을 수 있으면 취소하지 않음", () => {
  const e = { orderId: "o1", amount: 1900 };
  assert.equal(decideAfterKakaoApproveFailure(null, e), "retry");
  assert.equal(decideAfterKakaoApproveFailure({ status: "SUCCESS_PAYMENT", partnerOrderId: "o1", total: 1900 }, e), "paid");
  assert.equal(decideAfterKakaoApproveFailure({ status: "SUCCESS_PAYMENT", partnerOrderId: "o1", total: 990 }, e), "retry");
  assert.equal(decideAfterKakaoApproveFailure({ status: "QUIT_PAYMENT", partnerOrderId: "o1", total: 1900 }, e), "cancel");
  assert.equal(decideAfterKakaoApproveFailure({ status: "PART_CANCEL_PAYMENT", partnerOrderId: "o1", total: 1900 }, e), "retry");
});
