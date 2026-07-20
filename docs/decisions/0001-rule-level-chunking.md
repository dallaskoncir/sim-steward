# ADR-001: Chunk per numbered rule, not per section

## Status
Accepted

## Date
2026-07-20

## Context
PROJECT_BRIEF.md's Phase 2 description reads: "extract the `##` headers as
metadata (e.g., `section: "1.0 Overtaking and Defending"`)," which could be
read as chunking the rulebook whole-section-at-a-time — one Chroma record per
`## ` heading, with everything beneath it as the document body.

Phase 4, however, requires citing individual rules by ID in the format
`[Rule 1.1]`. A section like `## 1.0 Overtaking and Defending` contains
multiple distinct penalties (`1.1`, `1.2`, `1.3`), each with its own trigger
condition and penalty. If retrieval and citation operate on whole sections,
the model would have no way to point at a single sub-rule — it would have to
cite the whole section, or the citation ID and the retrieval unit would be
different things entirely.

## Decision
Chunk per numbered sub-rule (e.g. `1.1`, `1.2`), not per `## ` section. The
section header becomes filterable metadata (`section`, `sectionNumber`)
attached to each rule, rather than the chunk boundary itself.

## Alternatives Considered

### Whole-section chunking (one record per `## ` heading)
- Pros: Matches a literal reading of the Phase 2 brief; fewer, larger chunks
- Cons: A section mixes multiple unrelated penalties into one embedding and
  one document, which weakens embedding similarity (the vector represents an
  average of several rules) and makes Phase 4's `[Rule 1.1]`-style citation
  impossible without a second parsing pass to find the sub-rule inside the
  cited section
- Rejected: incompatible with the citation granularity Phase 4 already
  commits to

## Consequences
- Each rule's own number (e.g. `"1.1"`) is used as the Chroma record ID
  instead of a positional or section-based ID, so Phase 4 can cite it
  directly.
- `--section` (Phase 2) filters by `sectionNumber` metadata rather than by
  chunk identity, since the chunk and the section are no longer the same
  thing.
- Parsing must extract each rule individually, which is why
  `src/parse-rulebook.ts` walks the AST at the list-item level rather than
  the heading level. See also the fix for colon-in-title parsing in that file.
