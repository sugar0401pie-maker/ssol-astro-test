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
