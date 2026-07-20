import { test } from "node:test";
import assert from "node:assert/strict";
import { assertIncidentLength } from "./validate.ts";

test("accepts a string exactly at the max length", () => {
  assert.doesNotThrow(() => assertIncidentLength("a".repeat(2000), 2000));
});

test("rejects a string one character over the max length", () => {
  assert.throws(() => assertIncidentLength("a".repeat(2001), 2000), RangeError);
});
