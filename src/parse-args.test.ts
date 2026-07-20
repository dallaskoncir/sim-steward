import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQueryArgs } from "./parse-args.ts";

test("joins non-flag args into the incident text", () => {
  assert.deepEqual(parseQueryArgs(["divebomb", "at", "turn", "1"]), {
    incident: "divebomb at turn 1",
    section: undefined,
  });
});

test("parses --section <value> preceding the incident text", () => {
  assert.deepEqual(parseQueryArgs(["--section", "2.0", "unsafe", "rejoin"]), {
    incident: "unsafe rejoin",
    section: "2.0",
  });
});

test("parses --section <value> following the incident text", () => {
  assert.deepEqual(parseQueryArgs(["unsafe", "rejoin", "--section", "2.0"]), {
    incident: "unsafe rejoin",
    section: "2.0",
  });
});

test("parses --section=value form", () => {
  assert.deepEqual(parseQueryArgs(["--section=2.0", "unsafe", "rejoin"]), {
    incident: "unsafe rejoin",
    section: "2.0",
  });
});

test("returns undefined section when the flag is absent", () => {
  assert.equal(parseQueryArgs(["just", "an", "incident"]).section, undefined);
});
