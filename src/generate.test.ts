import { test } from "node:test";
import assert from "node:assert/strict";
import { buildUserPrompt } from "./generate.ts";

test("includes the incident text", () => {
  const prompt = buildUserPrompt("someone divebombed me at turn 1", []);
  assert.match(prompt, /someone divebombed me at turn 1/);
});

test("formats each rule with its exact citable Rule ID", () => {
  const prompt = buildUserPrompt("incident", [
    { id: "1.1", title: "The Vortex of Danger", text: "Some rule text." },
    { id: "4.2", title: "Retaliation", text: "Other rule text." },
  ]);

  assert.match(prompt, /\[Rule 1\.1\] The Vortex of Danger: Some rule text\./);
  assert.match(prompt, /\[Rule 4\.2\] Retaliation: Other rule text\./);
});

test("preserves rule order", () => {
  const prompt = buildUserPrompt("incident", [
    { id: "2.1", title: "Unsafe Rejoin", text: "x" },
    { id: "1.3", title: "Squeezing", text: "y" },
  ]);

  const indexOf21 = prompt.indexOf("[Rule 2.1]");
  const indexOf13 = prompt.indexOf("[Rule 1.3]");
  assert.ok(indexOf21 >= 0 && indexOf13 >= 0 && indexOf21 < indexOf13);
});

test("handles no rules without throwing", () => {
  assert.doesNotThrow(() => buildUserPrompt("incident with no matches", []));
});
