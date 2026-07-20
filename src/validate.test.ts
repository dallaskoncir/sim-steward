import { test } from "node:test";
import assert from "node:assert/strict";
import { assertIncidentLength, assertSectionFormat } from "./validate.ts";

test("accepts a string exactly at the max length", () => {
  assert.doesNotThrow(() => assertIncidentLength("a".repeat(2000), 2000));
});

test("rejects a string one character over the max length", () => {
  assert.throws(() => assertIncidentLength("a".repeat(2001), 2000), RangeError);
});

test("accepts a well-formed section number", () => {
  assert.doesNotThrow(() => assertSectionFormat("1.0"));
});

test("rejects a section value that isn't n.n", () => {
  assert.throws(() => assertSectionFormat("foo"), RangeError);
  assert.throws(() => assertSectionFormat("1"), RangeError);
  assert.throws(() => assertSectionFormat("1.0.0"), RangeError);
});
