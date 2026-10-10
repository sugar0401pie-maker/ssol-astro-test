import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { GUIDE_ART_FILES, pickGuideArt, type GuideArtId } from "./art.ts";

test("안내 그림: 화면마다 목록 중 하나를 고르고, 목록의 파일은 모두 실제로 있다", () => {
  assert.equal(pickGuideArt("02", 0), "/guide/02/a.webp");
  assert.equal(pickGuideArt("02", 0.99), "/guide/02/b.webp");
  assert.equal(pickGuideArt("02", 1), "/guide/02/b.webp"); // 범위 밖 값도 안전하게
  for (const [id, files] of Object.entries(GUIDE_ART_FILES)) {
    assert.ok(files.length >= 1, id);
    for (const f of files) assert.ok(existsSync(new URL(`../../public/guide/${id}/${f}`, import.meta.url)), `${id}/${f}`);
    assert.ok(pickGuideArt(id as GuideArtId, 0.5)?.startsWith(`/guide/${id}/`));
  }
});
