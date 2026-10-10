import { test } from "node:test";
import assert from "node:assert/strict";
import { naverToOidc } from "./naverUserinfo.ts";

test("네이버 사용자 정보를 Supabase가 읽는 모양(sub·email)으로, 이메일 인증은 늘 false", () => {
  const out = naverToOidc({ resultcode: "00", message: "success", response: { id: "abc123", email: "a@naver.com", name: "홍길동", nickname: "길동" } });
  assert.deepEqual(out, { sub: "abc123", email: "a@naver.com", email_verified: false, name: "홍길동", nickname: "길동" });
  assert.deepEqual(naverToOidc({ resultcode: "00", response: { id: "x" } }), { sub: "x", email_verified: false });
  assert.equal(naverToOidc({ resultcode: "024", message: "Authentication failed" }), null);
  assert.equal(naverToOidc({ resultcode: "00", response: {} }), null);
});
