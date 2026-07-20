import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPairs, combineScores } from "./rerank-scores.ts";

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

test("pairs every candidate with the query, not with each other", () => {
  const candidates = [
    { id: "a", text: "candidate A text" },
    { id: "b", text: "candidate B text" },
  ];

  const { text, text_pair } = buildPairs("the query", candidates);

  // Guards against an argument-order swap: text[] must be the query
  // repeated, text_pair[] must be each candidate's own text, never the
  // reverse or a candidate paired with another candidate.
  assert.deepEqual(text, ["the query", "the query"]);
  assert.deepEqual(text_pair, ["candidate A text", "candidate B text"]);
});

test("keeps text/text_pair the same length as candidates, index-aligned", () => {
  const candidates = [
    { id: "a", text: "first" },
    { id: "b", text: "second" },
    { id: "c", text: "third" },
  ];

  const { text, text_pair } = buildPairs("q", candidates);

  assert.equal(text.length, candidates.length);
  assert.equal(text_pair.length, candidates.length);
  candidates.forEach((c, i) => assert.equal(text_pair[i], c.text));
});

test("returns empty arrays for empty candidates", () => {
  assert.deepEqual(buildPairs("q", []), { text: [], text_pair: [] });
});
