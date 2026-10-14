import { test } from "node:test";
import assert from "node:assert/strict";
import { writingMessages } from "./writingMessages.ts";
import { BANNED_PHRASES } from "./validate.ts";

test("리포트 쓰는 중 문구: 이름이 채워지고, 예측·단정 표현이 없다", () => {
  const ms = writingMessages("호로록냠냠");
  assert.equal(ms.length, 8);
  assert.equal(ms[0], "별빛을 모아 리포트를 한 장씩 쓰고 있어요..");
  assert.ok(ms[1].startsWith("호로록냠냠님의"));
  for (const m of ms) {
    assert.ok(!m.includes("{"), m);
    assert.ok(!/운세|점쳐|반드시|될 거/.test(m), m);
    for (const b of BANNED_PHRASES) assert.ok(!m.includes(b), m);
  }
  assert.equal(writingMessages(" ")[1], "당신의 별자리를 그려 보고 있어요..");
});
