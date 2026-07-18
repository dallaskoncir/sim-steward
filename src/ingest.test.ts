import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkByHeading } from "./chunk.ts";

test("drops the top-level title, keeping only ## sections", () => {
  const markdown = [
    "# Sim Racing Penalty Guidelines",
    "",
    "## Track Limits Violation",
    "Some rule text.",
    "",
    "## Causing a Collision",
    "Some other rule text.",
  ].join("\n");

  const chunks = chunkByHeading(markdown);

  assert.equal(chunks.length, 2);
  assert.ok(chunks.every((chunk) => chunk.startsWith("## ")));
  assert.match(chunks[0], /^## Track Limits Violation/);
  assert.match(chunks[1], /^## Causing a Collision/);
});

test("returns nothing for markdown with no ## headings", () => {
  const markdown = "# Just a title\n\nNo rules here.";
  assert.deepEqual(chunkByHeading(markdown), []);
});
