# ADR-004: Use phi4 for grounded citation generation, not the brief's suggested models

## Status
Accepted

## Date
2026-07-20

## Context
PROJECT_BRIEF.md's Phase 4 suggests hooking retrieval into "a local chat
model via Ollama (e.g., `llama3.2` or `qwen2.5`)". Neither was pulled on
the Ollama instance this project uses (checked via `GET /api/tags`); the
models actually available were `phi4:latest` (14.7B, general
`completion`) and `qwen2.5-coder:14b` (14.8B, code-specialized).

Asked the user rather than silently picking one or pulling a new model:
pulling `llama3.2`/`qwen2.5` matches the brief exactly but costs a
multi-GB download on the Windows-hosted Ollama instance this project
reaches over the WSL2 gateway; `phi4` was already available and, being a
general-purpose instruct model rather than one specialized for code
generation, is a reasonable fit for prose explanation with citations.

## Decision
Use `phi4` as `CHAT_MODEL` in `src/generate.ts`.

## Alternatives Considered

### Pull `llama3.2` or `qwen2.5` as the brief names
- Pros: matches the brief's example exactly
- Cons: requires a fresh multi-GB download before Phase 4 could be tested
  at all
- Rejected (by the user's choice): `phi4` was already available and no
  meaningful capability gap was expected for this task

### Use `qwen2.5-coder:14b` (already available)
- Pros: also already pulled, no download needed
- Cons: code-specialized variant; prose generation with natural-language
  citations is not its tuning target
- Rejected: `phi4` is the better-fitting general-purpose model of the two
  already-available options

## Consequences
- The brief's exact model names are documented here as *not* what's
  actually configured, so a future reader checking `src/generate.ts`
  against PROJECT_BRIEF.md isn't left wondering whether that's a bug.
- If `llama3.2`/`qwen2.5` are pulled later, swapping `CHAT_MODEL` in
  `src/generate.ts` is a one-line change; the prompt-building and
  citation-checking logic doesn't depend on which model is configured.
- No revision/tag pinning was added for `phi4` (unlike the cross-encoder
  in ADR-002) since Ollama models are pulled and versioned locally by tag,
  not resolved from a remote default branch on every run — there's no
  equivalent floating-reference risk here.
