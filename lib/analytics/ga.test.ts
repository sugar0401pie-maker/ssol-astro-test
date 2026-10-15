import { test } from "node:test";
import assert from "node:assert/strict";
import { gaEventFor, gaPageLocation, isGaId } from "./ga.ts";

test("측정 ID 형식", () => {
  assert.ok(isGaId("G-AB12CD34EF"));
  assert.ok(!isGaId(""));
  assert.ok(!isGaId("UA-1234-1"));
  assert.ok(!isGaId(undefined));
});

test("우리 이벤트 → GA4 이벤트(값은 장 번호·금액뿐)", () => {
  assert.deepEqual(gaEventFor("experience_done", {}, 1900), { name: "test_start", params: {} });
  assert.deepEqual(gaEventFor("birth_done", {}, 1900), { name: "birth_info_submit", params: {} });
  assert.deepEqual(gaEventFor("result_view", { page: 2 }, 1900), { name: "free_result_view", params: { page: 2 } });
  assert.equal(gaEventFor("result_view", { page: 4 }, 1900), null);
  assert.deepEqual(gaEventFor("pay_click", { page: 4 }, 1900), { name: "paid_click", params: { currency: "KRW", value: 1900 } });
  assert.equal(gaEventFor("intro_view", {}, 1900), null);
  // 유입 경로 값이 props에 섞여 와도 GA 이벤트 값으로 넘기지 않는다(GA는 utm을 페이지 주소로 따로 읽음)
  assert.deepEqual(gaEventFor("birth_done", { utm_source: "x" }, 1900)?.params, {});
});

test("페이지 주소: id는 가리고 쿼리는 utm만", () => {
  assert.deepEqual(gaPageLocation("https://astro.ssolwellnesshouse.com", "/results/0f8fad5b-d9cb-469f-a165-70867728950e/3", ""), {
    location: "https://astro.ssolwellnesshouse.com/results/:id/3",
    path: "/results/:id/3",
  });
  const s = gaPageLocation("https://astro.ssolwellnesshouse.com", "/checkout/success", "?paymentKey=tgen_1&orderId=0f8fad5b-d9cb-469f-a165-70867728950e&amount=1900");
  assert.equal(s.location, "https://astro.ssolwellnesshouse.com/checkout/success");
  const u = gaPageLocation("https://astro.ssolwellnesshouse.com", "/", "?utm_source=threads&utm_medium=post&utm_campaign=sajuvs&next=/x");
  assert.equal(u.location, "https://astro.ssolwellnesshouse.com/?utm_source=threads&utm_medium=post&utm_campaign=sajuvs");
});
