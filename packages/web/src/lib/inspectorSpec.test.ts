import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatSpecScalar,
  hasInventoryFields,
  isUnverified,
  remainingSpecKeys,
} from "./inspectorSpec.ts";

test("none vs null stay distinct in display", () => {
  assert.deepEqual(formatSpecScalar("none"), {
    text: "none",
    isNull: false,
  });
  assert.deepEqual(formatSpecScalar(null), {
    text: "null",
    isNull: true,
  });
});

test("running_image digests truncate with full title", () => {
  const image =
    "quay.io/prometheus/prometheus@sha256:64f71bb84e03c855948418b0fc5dea53e9543d8e3fc9931598f583805507f05e";
  assert.deepEqual(formatSpecScalar(image), {
    text: "quay.io/prometheus/prometheus@sha256:64f71bb84e03…",
    title: image,
    isNull: false,
  });
});

test("unverified only when verified_at is explicitly null", () => {
  assert.equal(isUnverified({ verified_at: null }), true);
  assert.equal(isUnverified({ verified_at: "2026-09-05T17:22:00Z" }), false);
  assert.equal(isUnverified({ pinned_version: "1.0.0" }), false);
});

test("remaining keys exclude structural and inventory fields", () => {
  assert.deepEqual(
    remainingSpecKeys({
      type: "service",
      owner: "user:daniel",
      pinned_version: "1.0.0",
      bundled_images: [{ upstream_repo: "a/b" }],
      custom_note: "x",
    }),
    ["bundled_images", "custom_note"],
  );
  assert.equal(hasInventoryFields({ type: "service" }), false);
  assert.equal(hasInventoryFields({ pinned_version: "none" }), true);
});
