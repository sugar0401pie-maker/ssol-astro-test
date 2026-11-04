import { test } from "node:test";
import assert from "node:assert/strict";
import { enSiteEnabled, isBot, rootRedirect, switchTarget } from "./lang.ts";

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const base = { pathname: "/", country: "US", cookieLang: null, userAgent: UA, enabled: true };

test("스위치가 꺼져 있으면 아무도 보내지 않는다", () => {
  assert.equal(rootRedirect({ ...base, enabled: false }), null);
  assert.equal(enSiteEnabled(undefined), false);
  assert.equal(enSiteEnabled("1"), true);
  assert.equal(enSiteEnabled("true"), false);
});

test("한국 밖에서 처음 오면 영문 첫 화면, 한국이면 그대로", () => {
  assert.equal(rootRedirect(base), "/en");
  assert.equal(rootRedirect({ ...base, country: "kr" }), null);
  assert.equal(rootRedirect({ ...base, country: "" }), null);
  assert.equal(rootRedirect({ ...base, country: null }), null);
});

test("고른 언어가 지역보다 우선", () => {
  assert.equal(rootRedirect({ ...base, cookieLang: "ko" }), null);
  assert.equal(rootRedirect({ ...base, country: "KR", cookieLang: "en" }), "/en");
  assert.equal(rootRedirect({ ...base, cookieLang: "fr" }), "/en");
});

test("첫 화면만 보내고, 로봇·빈 User-Agent는 보내지 않는다", () => {
  assert.equal(rootRedirect({ ...base, pathname: "/results/abc/3" }), null);
  assert.equal(rootRedirect({ ...base, pathname: "/test" }), null);
  assert.equal(rootRedirect({ ...base, pathname: "/en" }), null);
  assert.equal(rootRedirect({ ...base, userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }), null);
  assert.equal(rootRedirect({ ...base, userAgent: "" }), null);
  assert.equal(isBot("facebookexternalhit/1.1"), true);
  assert.equal(isBot("Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/spd)"), true);
  assert.equal(isBot(UA), false);
});

test("언어 링크는 같은 화면이 있으면 그 화면, 없으면 그 언어 첫 화면", () => {
  assert.equal(switchTarget("/", "en"), "/en");
  assert.equal(switchTarget("/en", "ko"), "/");
  assert.equal(switchTarget("/results/abc/3", "en"), "/en");
  assert.equal(switchTarget("/en/start", "ko"), "/");
});
