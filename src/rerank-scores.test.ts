import { test } from "node:test";
import assert from "node:assert/strict";
import { combineScores } from "./rerank-scores.ts";

test("sorts candidates by descending score", () => {
  const candidates = [
    { id: "a", text: "low relevance" },
    { id: "b", text: "high relevance" },
    { id: "c", text: "medium relevance" },
  ];
  const scores = [-2.5, 8.8, 1.1];

  const result = combineScores(candidates, scores);

  assert.deepEqual(
    result.map((r) => r.id),
    ["b", "c", "a"],
  );
});

test("attaches each candidate's own score", () => {
  const result = combineScores([{ id: "a", text: "x" }], [3.14]);
  assert.equal(result[0]!.score, 3.14);
});

test("returns an empty array for empty input", () => {
  assert.deepEqual(combineScores([], []), []);
});

test("preserves relative order of ties (stable sort)", () => {
  const candidates = [
    { id: "a", text: "x" },
    { id: "b", text: "y" },
  ];
  const result = combineScores(candidates, [5, 5]);
  assert.deepEqual(
    result.map((r) => r.id),
    ["a", "b"],
  );
});
