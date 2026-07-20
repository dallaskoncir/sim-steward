# ADR-002: Local cross-encoder re-ranking via `@huggingface/transformers`, with an `overrides` pin instead of a downgrade

## Status
Accepted

## Date
2026-07-20

## Context
PROJECT_BRIEF.md's Phase 3 calls for two-stage retrieval: pull a wider
candidate set from Chroma's dense-embedding search, then re-score those
candidates with a cross-encoder that reads the query and each candidate
together (rather than independently, as `nomic-embed-text` does), and keep
only the top 2. The brief names `@huggingface/transformers` and
`Xenova/ms-marco-MiniLM-L-6-v2` specifically.

This is a different class of dependency than anything else in the project:
it pulls in `onnxruntime-node` (a native ONNX runtime, prebuilt binaries
bundled per-platform) and downloads an ~88MB model to
`node_modules/@huggingface/transformers/.cache/` on first use, wiped and
re-fetched on every fresh `npm install`. Installing it also surfaced a real
high-severity transitive vulnerability: `adm-zip <0.6.0` (used internally by
`onnxruntime-node`), GHSA-xcpc-8h2w-3j85. `npm audit fix --force`'s
suggested remediation was downgrading `@huggingface/transformers` itself
(3.8.1, a breaking major-version change) to reach a dependency tree that
doesn't pull the vulnerable `adm-zip` version.

## Decision
1. Use `@huggingface/transformers` + `Xenova/ms-marco-MiniLM-L-6-v2` as
   specified, loaded lazily and memoized (not at module scope) so importing
   `src/rerank.ts` never triggers a download as a side effect.
2. Pin `from_pretrained`'s `revision` option to the model repo's current
   commit SHA (`a09144355adeed5f58c8ed011d209bf8ee5a1fec`) instead of
   floating on its default branch, so a future upstream model update can't
   silently change query results underneath a query.
3. Fix the `adm-zip` advisory with a scoped `package.json` `overrides` pin
   (`"adm-zip": "^0.6.0"`) rather than downgrading
   `@huggingface/transformers`.

## Alternatives Considered

### Downgrade `@huggingface/transformers` to 3.8.1 (npm's suggested fix)
- Pros: no `overrides` entry to maintain; "officially" recommended by `npm audit fix --force`
- Cons: a real breaking change (major version) for a security issue that
  only affects `onnxruntime-node`'s own internals (unzipping its prebuilt
  native binary during install, not something our code invokes on
  attacker-controlled input); untested against the rest of the codebase
- Rejected: adopts an unrelated breaking change to fix a package we don't
  call directly, when a narrower fix exists

### Leave the floating `main`-branch model reference (no `revision` pin)
- Pros: always picks up upstream fixes/improvements automatically
- Cons: query results could change silently between runs if the upstream
  repo is updated, with no record of what changed or when; same class of
  risk `package-lock.json`/`overrides` already exist to prevent for npm
  packages
- Rejected: low-stakes today, but Phase 4 adds a second HF-hosted model —
  better to establish the pinning habit now than retrofit it later

## Consequences
- `MODEL_REVISION` in `src/rerank.ts` needs a manual bump (and re-verification
  against the live pipeline) if the upstream model is ever intentionally
  updated — it will not happen automatically.
- The `adm-zip` `overrides` pin in `package.json` is a maintenance edge:
  if a future `@huggingface/transformers`/`onnxruntime-node` upgrade no
  longer depends on a vulnerable `adm-zip`, the override becomes redundant
  (harmless, but worth removing during that upgrade rather than carrying it
  forward indefinitely).
- `npm audit` must be re-run after any future dependency change that
  touches this tree, since the override only covers the advisory known at
  the time this ADR was written.
