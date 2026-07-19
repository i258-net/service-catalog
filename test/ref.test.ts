import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRef } from "../src/ref.ts";

test("parses full references", () => {
  assert.equal(parseRef("component:default/orders"), "component:default/orders");
  assert.equal(parseRef("Component:Payments/Orders"), "component:payments/orders");
});

test("fills in defaults for partial references", () => {
  assert.equal(parseRef("orders", "Component"), "component:default/orders");
  assert.equal(parseRef("api:payments-api"), "api:default/payments-api");
  assert.equal(parseRef("infra/orders-db", "Resource"), "resource:infra/orders-db");
});

test("rejects references with no kind or no name", () => {
  assert.throws(() => parseRef("orders"), /no kind/);
  assert.throws(() => parseRef("component:"), /no name/);
});
