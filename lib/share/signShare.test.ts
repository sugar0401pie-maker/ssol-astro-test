import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { kakaoArtUrl, pickSignArt, signArtChoices, signShareMessage, signShareTexts } from "./signShare.ts";

test("별자리 공유: 그 별자리 그림 7장 중 하나, 잠긴 그림은 빼고, 파일이 실제로 있다", () => {
  const list = signArtChoices(0);
  assert.equal(list.length, 7);
  assert.ok(list.every((p) => p.startsWith("/art/aries/") && !p.includes("locked")));
  for (let i = 0; i < 12; i++) for (const p of signArtChoices(i)) assert.ok(existsSync(`public${p}`), p);
  assert.equal(pickSignArt(3, () => 0), "/art/cancer/art_01_sky.webp");
  assert.equal(pickSignArt(3, () => 0.9999), "/art/cancer/art_07_question.webp");
  assert.equal(pickSignArt(99), null);
});

test("별자리 공유 글자: 이름·소개(최대 2줄)·사이트, 출생 정보 없음", () => {
  const intro = { oneLiner: "먼저 불을 붙이고 부딪히며 길을 여는 별자리예요.", keywords: "시작 · 용기 · 직진" };
  const t = signShareTexts("양자리", intro);
  assert.equal(t[0].text, "양자리");
  assert.ok(t.length <= 4);
  assert.ok(t.slice(1, -1).join("").length > 0);
  assert.ok(!/\d{4}|년|월 \d|시 \d/.test(t.map((x) => x.text).join(" ").replace("astro.ssolwellnesshouse.com", "")));
  assert.match(signShareMessage("양자리", intro), /^양자리 — 먼저 불을/);
});

test("카카오 카드 그림: 같은 그림의 jpg 사본(절대 주소), 12별자리 모두 있다", () => {
  assert.equal(kakaoArtUrl("/art/aries/art_02_type.webp"), "https://astro.ssolwellnesshouse.com/art/aries/kakao/art_02_type.jpg");
  for (let i = 0; i < 12; i++) for (const p of signArtChoices(i)) assert.ok(existsSync(`public${kakaoArtUrl(p, "")}`), p);
});
