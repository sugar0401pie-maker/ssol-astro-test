import { test } from "node:test";
import assert from "node:assert/strict";
import { naverToOidc } from "./naverUserinfo.ts";

test("네이버 사용자 정보를 Supabase가 읽는 모양(sub)으로, 이메일은 로그인 이메일이 아니라 contact_email로", () => {
  const out = naverToOidc({ resultcode: "00", message: "success", response: { id: "abc123", email: "a@naver.com", name: "홍길동", nickname: "길동" } });
  assert.deepEqual(out, { sub: "abc123", contact_email: "a@naver.com", name: "홍길동", nickname: "길동" });
  assert.ok(!("email" in out!));
  assert.deepEqual(naverToOidc({ resultcode: "00", response: { id: "x" } }), { sub: "x" });
  assert.equal(naverToOidc({ resultcode: "024", message: "Authentication failed" }), null);
  assert.equal(naverToOidc({ resultcode: "00", response: {} }), null);
});
