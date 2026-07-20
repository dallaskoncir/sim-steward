import { test } from "node:test";
import assert from "node:assert/strict";
import { fuseRankings } from "./fuse-rankings.ts";

test("an item ranked #1 in every input ranking wins", () => {
  const result = fuseRankings([
    ["a", "b", "c"],
    ["a", "c", "b"],
  ]);
  assert.equal(result[0], "a");
});

test("consistent moderate ranking beats one extreme high rank paired with one extreme low rank", () => {
  // "b" is #3 in both rankings. "a" is #1 in one but dead last (#10) in the
  // other — a single strong, unconfirmed signal. Consistent agreement wins.
  const ranking1 = ["a", "p1", "b", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
  const ranking2 = ["p9", "p10", "b", "p11", "p12", "p13", "p14", "p15", "p16", "a"];

  const result = fuseRankings([ranking1, ranking2]);

  assert.equal(result[0], "b");
});

test("handles rankings that don't fully overlap", () => {
  const result = fuseRankings([
    ["a", "b"],
    ["b", "c"],
  ]);
  // "b" appears (and highly ranked) in both; "a" and "c" each appear once.
  assert.equal(result[0], "b");
  assert.deepEqual(new Set(result), new Set(["a", "b", "c"]));
});

test("a single ranking is returned in its own order", () => {
  assert.deepEqual(fuseRankings([["x", "y", "z"]]), ["x", "y", "z"]);
});

test("returns an empty array for no rankings", () => {
  assert.deepEqual(fuseRankings([]), []);
});

test("k is a configurable parameter, not hardcoded", () => {
  // Same rankings as the "consistent moderate ranking" test above, where
  // the default k=60 makes "b" (consistent #3) beat "a" (#1 then #10). A
  // small k weights rank 1 much more heavily relative to lower ranks,
  // flipping the winner back to "a" — confirms k actually affects the
  // result rather than being silently ignored.
  const ranking1 = ["a", "p1", "b", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
  const ranking2 = ["p9", "p10", "b", "p11", "p12", "p13", "p14", "p15", "p16", "a"];

  const result = fuseRankings([ranking1, ranking2], 0.01);

  assert.equal(result[0], "a");
});
