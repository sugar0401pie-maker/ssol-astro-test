import { test } from "node:test";
import assert from "node:assert/strict";
import { isAnonId, isFunnelEvent, sanitizeProps } from "./events.ts";

test("이용 흐름 기록: 정해 둔 이벤트만, 짧은 값만 남긴다", () => {
  assert.ok(isFunnelEvent("result_view"));
  assert.ok(!isFunnelEvent("birth_1996-04-01"));
  assert.deepEqual(sanitizeProps({ page: 3, channel: "kakao", nickname: "지우", birth: "1996-04-01" }), { page: 3, channel: "kakao" });
  assert.deepEqual(sanitizeProps({ page: 9, method: "Kakao Login!" }), {});
  assert.deepEqual(sanitizeProps(null), {});
  assert.ok(isAnonId("abcdefghijklmnopqrstuvwxyz012345"));
  assert.ok(!isAnonId("짧음"));
});

test("유입 경로 짧은 값은 남기고 주소 전체·이상한 값은 버린다", () => {
  assert.deepEqual(
    sanitizeProps({ utm_source: "x", utm_campaign: "astro_launch_1015", ref: "Ab3dEf7hJk", referrer_host: "t.co", in_app: "kakaotalk", referrer: "https://t.co/abc?q=1", utm_medium: "<b>" }),
    { utm_source: "x", utm_campaign: "astro_launch_1015", ref: "Ab3dEf7hJk", referrer_host: "t.co", in_app: "kakaotalk" },
  );
});
