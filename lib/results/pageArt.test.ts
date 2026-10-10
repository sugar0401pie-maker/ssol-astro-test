import { test } from "node:test";
import assert from "node:assert/strict";
import { pageArtCandidates } from "./pageArt.ts";

test("결과 그림: 태양 별자리 폴더 먼저, 없으면 공통 그림", () => {
  assert.deepEqual(pageArtCandidates(1, 3), ["/art/cancer/art_01_sky.png", "/art/art_01_sky.png"]);
  assert.deepEqual(pageArtCandidates(7), ["/art/art_07_question.png"]);
  assert.deepEqual(pageArtCandidates(8, 0), []);
});
