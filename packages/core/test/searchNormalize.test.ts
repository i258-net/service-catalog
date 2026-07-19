import assert from "node:assert/strict";
import { test } from "node:test";
import { compactName, searchableText, tokenizeName } from "../src/searchNormalize.ts";

test("tokenizeName splits camelCase, kebab, and snake", () => {
  assert.deepEqual(tokenizeName("costOfLivingWorker"), ["cost", "of", "living", "worker"]);
  assert.deepEqual(tokenizeName("cost-of-living-api"), ["cost", "of", "living", "api"]);
  assert.deepEqual(tokenizeName("Cost_of_Living_WEB"), ["cost", "of", "living", "web"]);
});

test("compactName joins tokens without separators", () => {
  assert.equal(compactName("cost-of-living-api"), "costoflivingapi");
  assert.equal(compactName("costOfLivingWorker"), "costoflivingworker");
});

test("searchableText includes compact form for phrase queries", () => {
  const text = searchableText("cost-of-living-api", "Cost of Living API");
  assert.match(text, /\bcost\b/);
  assert.match(text, /\bliving\b/);
  assert.match(text, /\bcostoflivingapi\b/);
});
