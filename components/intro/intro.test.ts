import assert from "node:assert/strict";
import { test } from "node:test";
import { nextImage } from "./images.ts";

test("인트로 그림은 같은 그림이 연속으로 나오지 않는다", () => {
  const seq = [0.1, 0.1, 0.1, 0.5];
  let i = 0;
  assert.equal(nextImage(0, () => seq[i++]), 3); // 0.1 → 0번(같음)은 건너뛰고 0.5 → 3번
});
