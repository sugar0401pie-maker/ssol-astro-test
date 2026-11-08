import { test } from "node:test";
import assert from "node:assert/strict";
import { enSiteEnabled, isBot, koRoute, withoutLangParam } from "./lang.ts";
import { EN_SITE } from "../site.ts";

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const base = { pathname: "/", search: "", country: "US", cookieLang: null, userAgent: UA, enabled: true };

test("스위치: 정확히 '1'일 때만 켜짐", () => {
  assert.equal(enSiteEnabled(undefined), false);
  assert.equal(enSiteEnabled("true"), false);
  assert.equal(enSiteEnabled("1"), true);
});

test("스위치가 꺼져 있으면 해외 접속도 보내지 않는다", () => {
  assert.deepEqual(koRoute({ ...base, enabled: false }), { kind: "pass" });
  assert.deepEqual(koRoute({ ...base, pathname: "/results/abc/3", enabled: false }), { kind: "pass" });
});

test("해외 접속은 어느 화면이든 영문 첫 화면으로(매번), 광고 쿼리는 그대로", () => {
  assert.deepEqual(koRoute(base), { kind: "redirect", to: `${EN_SITE}/` });
  assert.deepEqual(koRoute({ ...base, pathname: "/test" }), { kind: "redirect", to: `${EN_SITE}/` });
  assert.deepEqual(koRoute({ ...base, pathname: "/results/abc/3" }), { kind: "redirect", to: `${EN_SITE}/` });
  assert.deepEqual(koRoute({ ...base, search: "?utm_source=x&twclid=1" }), { kind: "redirect", to: `${EN_SITE}/?utm_source=x&twclid=1` });
});

test("한국·지역 모름은 그대로", () => {
  assert.deepEqual(koRoute({ ...base, country: "kr" }), { kind: "pass" });
  assert.deepEqual(koRoute({ ...base, country: "" }), { kind: "pass" });
  assert.deepEqual(koRoute({ ...base, country: null }), { kind: "pass" });
});

test("예외 ①: 검색 로봇·빈 User-Agent는 보내지 않는다", () => {
  assert.deepEqual(koRoute({ ...base, userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }), { kind: "pass" });
  assert.deepEqual(koRoute({ ...base, userAgent: "" }), { kind: "pass" });
  assert.equal(isBot("Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/spd)"), true);
  assert.equal(isBot(UA), false);
});

test("예외 ②: 영문 사이트에서 '한국어'로 돌아온 사람은 기억하고 보내지 않는다", () => {
  assert.deepEqual(koRoute({ ...base, search: "?lang=ko" }), { kind: "remember-ko" });
  assert.deepEqual(koRoute({ ...base, cookieLang: "ko" }), { kind: "pass" });
  assert.equal(withoutLangParam("?lang=ko&utm_source=x"), "?utm_source=x");
  assert.equal(withoutLangParam("?lang=ko"), "");
});

test("결제 복귀·검색엔진 파일은 해외 접속이어도 그대로", () => {
  assert.deepEqual(koRoute({ ...base, pathname: "/checkout/success" }), { kind: "pass" });
  assert.deepEqual(koRoute({ ...base, pathname: "/robots.txt" }), { kind: "pass" });
  assert.deepEqual(koRoute({ ...base, pathname: "/sitemap.xml" }), { kind: "pass" });
});

test("예전 영문 주소(/en/…)는 켜져 있으면 영문 사이트의 같은 화면으로, 꺼져 있으면 숨김", () => {
  assert.deepEqual(koRoute({ ...base, country: "KR", pathname: "/en/start", search: "?a=1" }), { kind: "redirect", to: `${EN_SITE}/start?a=1` });
  assert.deepEqual(koRoute({ ...base, country: "KR", pathname: "/en" }), { kind: "redirect", to: `${EN_SITE}/` });
  assert.deepEqual(koRoute({ ...base, enabled: false, pathname: "/en/results/x/4" }), { kind: "redirect", to: "/" });
  assert.deepEqual(koRoute({ ...base, enabled: false, pathname: "/en/legal/privacy" }), { kind: "pass" });
  assert.deepEqual(koRoute({ ...base, enabled: false, pathname: "/english" }), { kind: "pass" });
});
