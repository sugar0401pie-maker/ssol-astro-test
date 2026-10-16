import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildConversionBody, buildIdentifiers, clientIp, hashEmail, hashPhone, toE164 } from "./conversion.ts";
import { isXEventId } from "./events.ts";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

test("이메일은 공백 제거·소문자 뒤 SHA-256", () => {
  assert.equal(hashEmail("  Jiwoo@Example.COM "), sha("jiwoo@example.com"));
  assert.equal(hashEmail("not-an-email"), null);
});

test("전화번호는 E.164로 바꾼 뒤 SHA-256", () => {
  assert.equal(toE164("010-1234-5678"), "+821012345678");
  assert.equal(toE164("+1 (555) 123-4567"), "+15551234567");
  assert.equal(toE164("12"), null);
  assert.equal(hashPhone("010 1234 5678"), sha("+821012345678"));
});

test("식별자: 없으면 null, ip·user_agent는 둘 다 있을 때만", () => {
  assert.equal(buildIdentifiers({}), null);
  assert.equal(buildIdentifiers({ ipAddress: "192.0.2.1" }), null);
  assert.deepEqual(buildIdentifiers({ twclid: "abc_123" }), { twclid: "abc_123" });
  assert.deepEqual(buildIdentifiers({ ipAddress: "192.0.2.1", userAgent: "Mozilla/5.0" }), { ip_address: "192.0.2.1", user_agent: "Mozilla/5.0" });
});

test("요청 본문 형식", () => {
  const b = buildConversionBody({ eventId: "tw-rh4ou-abcde", conversionTime: new Date("2026-10-16T01:02:03Z"), conversionId: "order-1", eventSourceUrl: "https://astro.ssolwellnesshouse.com/checkout/success", identifiers: { twclid: "x1" }, value: 1900, currency: "KRW" });
  assert.deepEqual(b, {
    conversions: [
      {
        conversion_time: "2026-10-16T01:02:03.000Z",
        event_id: "tw-rh4ou-abcde",
        identifiers: [{ twclid: "x1" }],
        event_source_url: "https://astro.ssolwellnesshouse.com/checkout/success",
        conversion_id: "order-1",
        value: "1900",
        price_currency: "KRW",
      },
    ],
  });
});

test("이벤트 ID 형식·클라이언트 IP", () => {
  assert.ok(isXEventId("tw-rh4ou-qx9ab"));
  assert.ok(!isXEventId("tw-other-qx9ab"));
  assert.ok(!isXEventId(null));
  const h = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
  assert.equal(clientIp(h), "203.0.113.5");
  assert.equal(clientIp(new Headers()), null);
});
