import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { PAGE_ART, SIGN_FILE_KEYS, pageArtCandidates } from "./pageArt.ts";

test("결과 그림: 태양 별자리 폴더 먼저, 없으면 공통 그림, 4장은 결제 전·후 그림이 다르다", () => {
  assert.deepEqual(pageArtCandidates(1, 3), ["/art/cancer/art_01_sky.webp", "/art/art_01_sky.webp"]);
  assert.deepEqual(pageArtCandidates(7), ["/art/art_07_question.webp"]);
  assert.deepEqual(pageArtCandidates(8, 0), []);
  assert.equal(pageArtCandidates(4, 0, true)[0], "/art/aries/art_04_locked.webp");
  assert.equal(pageArtCandidates(4, 0, false)[0], "/art/aries/art_04_eoy.webp");
  assert.equal(pageArtCandidates(5, 0, true)[0], "/art/aries/art_05_2027.webp"); // 잠김 그림은 4장만
});

test("결과 그림: 12별자리 × 7장(+4장 잠김) 파일이 모두 있다", () => {
  for (const sign of SIGN_FILE_KEYS)
    for (const page of Object.keys(PAGE_ART).map(Number))
      for (const locked of [false, true]) {
        const url = pageArtCandidates(page, SIGN_FILE_KEYS.indexOf(sign), locked)[0];
        assert.ok(existsSync(new URL(`../../public${url}`, import.meta.url)), url);
      }
});
