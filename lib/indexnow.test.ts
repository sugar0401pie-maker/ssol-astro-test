import { test } from "node:test";
import assert from "node:assert/strict";
import { keyFileBody } from "./indexnow.ts";

const KEY = "0123456789abcdef0123456789abcdef";

test("키 파일은 주소의 키가 환경변수 키와 같을 때만 키 한 줄", () => {
  assert.equal(keyFileBody(KEY, KEY), KEY);
  assert.equal(keyFileBody(KEY, ` ${KEY}\n`), KEY);
  assert.equal(keyFileBody("ffffffffffffffffffffffffffffffff", KEY), null);
});

test("환경변수 키가 없거나 형식이 다르면 404", () => {
  assert.equal(keyFileBody(KEY, undefined), null);
  assert.equal(keyFileBody("abc", "abc"), null);
});
