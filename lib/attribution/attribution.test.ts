import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attributionProps,
  inAppOf,
  mergeTouch,
  newSlug,
  readTouch,
  referrerHostOf,
  sanitizeAttribution,
  sanitizeTouch,
  shareUrl,
  slugFromPath,
  SLUG_RE,
  type Touch,
} from "./attribution.ts";

const OWN = "astro.ssolwellnesshouse.com";
const base = { search: "", pathname: "/", referrer: "", userAgent: "Mozilla/5.0", ownHost: OWN, now: new Date("2026-10-15T01:00:00Z") };

test("utm 값·공유 코드·도메인만 읽는다", () => {
  const t = readTouch({ ...base, search: "?utm_source=x&utm_medium=ad&utm_campaign=astro_launch_1015&utm_content=소재A&ref=Ab3dEf7hJk", referrer: "https://t.co/abc?q=검색어" });
  assert.equal(t.utm_source, "x");
  assert.equal(t.utm_medium, "ad");
  assert.equal(t.utm_campaign, "astro_launch_1015");
  assert.equal(t.utm_content, "소재A");
  assert.equal(t.ref, "Ab3dEf7hJk");
  assert.equal(t.referrer_host, "t.co");
  assert.equal(t.landing_path, "/");
  assert.equal(t.in_app, "none");
  // 들어오기 직전 주소 전체·쿼리는 어디에도 남지 않는다
  assert.ok(!JSON.stringify(t).includes("검색어"));
});

test("공유 주소(/share/<코드>)면 ref가 없어도 코드를 읽는다", () => {
  const t = readTouch({ ...base, pathname: "/share/Ab3dEf7hJk" });
  assert.equal(t.ref, "Ab3dEf7hJk");
  assert.equal(t.landing_path, "/share/Ab3dEf7hJk");
  assert.equal(slugFromPath("/share/bad!"), undefined);
});

test("이상한 값은 버린다", () => {
  const t = readTouch({ ...base, search: "?utm_source=<script>&ref=x" });
  assert.equal(t.utm_source, undefined);
  assert.equal(t.ref, undefined);
});

test("이 사이트 자신에서 온 것은 바깥 유입이 아니다", () => {
  assert.equal(referrerHostOf("https://astro.ssolwellnesshouse.com/test", OWN), undefined);
  assert.equal(referrerHostOf("https://www.instagram.com/x", OWN), "instagram.com");
  assert.equal(referrerHostOf("not a url", OWN), undefined);
});

test("앱 안 브라우저 판별", () => {
  assert.equal(inAppOf("Mozilla/5.0 (iPhone) KAKAOTALK 10.4.5"), "kakaotalk");
  assert.equal(inAppOf("Mozilla/5.0 Instagram 300.0"), "instagram");
  assert.equal(inAppOf("Mozilla/5.0 Line/13.0"), "line");
  assert.equal(inAppOf("Mozilla/5.0 Safari"), "none");
});

const touch = (iso: string, extra: Partial<Touch> = {}): Touch => ({ first_seen_at: iso, ...extra });

test("처음 유입은 30일 안에 덮어쓰지 않고, 이번 방문은 새 신호가 있을 때만 바뀐다", () => {
  const first = touch("2026-10-01T00:00:00Z", { utm_source: "x" });
  const prev = { first, last: first };
  // 신호 없는 재방문: 둘 다 그대로
  const quiet = mergeTouch(prev, touch("2026-10-10T00:00:00Z"), new Date("2026-10-10T00:00:00Z"));
  assert.equal(quiet.first, first);
  assert.equal(quiet.last, first);
  // 카카오 공유로 재방문: 처음은 그대로, 이번 방문만 바뀜
  const kakao = touch("2026-10-12T00:00:00Z", { utm_source: "kakao", ref: "Ab3dEf7hJk" });
  const m = mergeTouch(prev, kakao, new Date("2026-10-12T00:00:00Z"));
  assert.equal(m.first.utm_source, "x");
  assert.equal(m.last.utm_source, "kakao");
  // 30일이 지나면 처음 유입도 새로
  const later = mergeTouch(prev, touch("2026-11-05T00:00:00Z"), new Date("2026-11-05T00:00:00Z"));
  assert.equal(later.first.first_seen_at, "2026-11-05T00:00:00Z");
  // 처음
  const fresh = mergeTouch(null, kakao, new Date());
  assert.equal(fresh.first, kakao);
});

test("서버 거르기: 모르는 칸·형식은 빠진다", () => {
  const t = sanitizeTouch({ first_seen_at: "2026-10-15T01:00:00Z", utm_source: "x", ref: "Ab3dEf7hJk", referrer_host: "t.co", landing_path: "/share/Ab3dEf7hJk?x=1", in_app: "kakaotalk", email: "a@b.c", ip: "1.2.3.4" });
  assert.deepEqual(t, { first_seen_at: "2026-10-15T01:00:00.000Z", utm_source: "x", ref: "Ab3dEf7hJk", referrer_host: "t.co", landing_path: "/share/Ab3dEf7hJk", in_app: "kakaotalk" });
  assert.equal(sanitizeTouch({ utm_source: "x" }), null);
  assert.equal(sanitizeAttribution("x"), null);
  const a = sanitizeAttribution({ first: { first_seen_at: "2026-10-01T00:00:00Z", utm_source: "x" }, last: null });
  assert.equal(a?.last.utm_source, "x");
});

test("공유 코드·주소", () => {
  const slug = newSlug((n) => Uint8Array.from({ length: n }, (_, i) => i * 37));
  assert.match(slug, SLUG_RE);
  assert.equal(slug.length, 10);
  assert.equal(shareUrl("https://astro.ssolwellnesshouse.com", slug, "kakao"), `https://astro.ssolwellnesshouse.com/share/${slug}?ref=${slug}&utm_source=kakao&utm_medium=share`);
});

test("이용 흐름 기록용 짧은 값", () => {
  assert.deepEqual(attributionProps(touch("2026-10-15T00:00:00Z", { utm_source: "x", landing_path: "/" })), { utm_source: "x" });
  assert.deepEqual(attributionProps(null), {});
});
