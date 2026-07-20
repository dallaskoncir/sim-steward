import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRulebook } from "./parse-rulebook.ts";

const SAMPLE = [
  "# Official Sim Racing League Sporting Code",
  "",
  "## 1.0 Overtaking and Defending",
  "- **1.1 The Vortex of Danger:** Some rule text. Penalty: 10s.",
  "- **1.2 Moving Under Braking:** Some other rule text. Penalty: 5s.",
  "",
  "## 2.0 Track Limits and Rejoining",
  "- **2.1 Unsafe Rejoin:** Yet more rule text. Penalty: 20s.",
].join("\n");

test("extracts one rule per list item, tagged with its section", () => {
  const rules = parseRulebook(SAMPLE);

  assert.equal(rules.length, 3);
  assert.deepEqual(
    rules.map((r) => r.id),
    ["1.1", "1.2", "2.1"],
  );
  assert.equal(rules[0]!.title, "The Vortex of Danger");
  assert.equal(rules[0]!.section, "1.0 Overtaking and Defending");
  assert.equal(rules[0]!.sectionNumber, "1.0");
  assert.equal(rules[0]!.text, "Some rule text. Penalty: 10s.");
});

test("carries the section forward across multiple rules", () => {
  const rules = parseRulebook(SAMPLE);
  assert.equal(rules[2]!.sectionNumber, "2.0");
  assert.equal(rules[2]!.section, "2.0 Track Limits and Rejoining");
});

test("returns nothing for markdown with no numbered rules", () => {
  const markdown = "# Title\n\nJust prose, no sections or rules.";
  assert.deepEqual(parseRulebook(markdown), []);
});

test("ignores list items that don't match the numbered rule pattern", () => {
  const markdown = [
    "## 1.0 A Section",
    "- Just a plain bullet, no rule ID.",
    "- **1.1 A Real Rule:** Text. Penalty: 5s.",
  ].join("\n");

  const rules = parseRulebook(markdown);
  assert.equal(rules.length, 1);
  assert.equal(rules[0]!.id, "1.1");
});
