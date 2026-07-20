# sim-steward

A local, CLI-based RAG proof of concept for sim racing leagues. Feed it a
plain-English description of an on-track incident (e.g. "divebomb into turn
1") and it retrieves the closest matching rules from a penalty rulebook.

Parses `data/rulebook.md` into individual numbered rules (e.g. `1.1 The Vortex
of Danger`), embeds each one via [Ollama](https://ollama.com/), and stores
them — along with their section metadata — in a local
[Chroma](https://www.trychroma.com/) vector database that you can query from
the command line.

## Quick Start

### Prerequisites
- Node.js 20+ (required by the `chromadb` client)
- [Ollama](https://ollama.com/) running locally, with the embedding model pulled:
  ```
  ollama pull nomic-embed-text
  ```
- [Chroma](https://docs.trychroma.com/) running locally:
  ```
  chroma run --path ./chroma-data
  ```

### Setup
```
npm install
npm run ingest
```
This parses `data/rulebook.md` into individual numbered rules, embeds each
one, and (re)builds the `rulebook` collection in Chroma from scratch.

### Query
```
npm run query -- "divebomb into turn 1 that put another car in the wall"
```
Returns the top 3 closest-matching rules with their vector distance.

Pre-filter to a specific rulebook section (skips embedding-similarity search
outside it) with `--section`:
```
npm run query -- "brake tested me on the straight" --section 4.0
```

## Commands

| Command | Description |
|---|---|
| `npm run ingest` | Parse `data/rulebook.md` into rules and load them into Chroma |
| `npm run query -- "<incident>" [--section <n.0>]` | Embed an incident description and retrieve matching rules, optionally pre-filtered to one rulebook section |
| `npm run typecheck` | Run TypeScript in `--noEmit` mode |
| `npm test` | Run the test suite |

## Configuration

Ollama and Chroma hosts can be overridden via environment variables — useful
under WSL2, where Ollama on the Windows host isn't reachable at `127.0.0.1`:

| Variable | Default |
|---|---|
| `OLLAMA_HOST` | Ollama client default (`127.0.0.1:11434`) |
| `CHROMA_HOST` | `localhost` |
| `CHROMA_PORT` | `8000` |

## Architecture

- `src/parse-rulebook.ts` — parses the rulebook markdown into an AST (via
  `unified`/`remark-parse`) and extracts one rule per numbered list item
  (e.g. `1.1 The Vortex of Danger: ...`), tagged with its parent `## ` section
  as metadata (`section`, `sectionNumber`).
- `src/parse-args.ts` — parses CLI args into the incident text and an
  optional `--section` filter.
- `src/validate.ts` — input validation shared by ingest/query (e.g. incident
  length cap).
- `src/ingest.ts` — reads the rulebook, embeds each rule (title + body) via
  Ollama, and rebuilds the `rulebook` collection in Chroma from scratch on
  every run. Chroma record IDs are the rule's own number (e.g. `"1.1"`), not
  array position, so re-ingesting after the rulebook is edited can't
  silently overwrite the wrong rule's vector.
- `src/query.ts` — embeds a CLI-supplied incident description, optionally
  pre-filters by section metadata, and queries Chroma for the top 3 nearest
  rules.
- `data/rulebook.md` — sample sporting code used as the source of truth.

This is a scoped, weekend-sized POC (see `PROJECT_BRIEF.md`) meant to prove
out chunking/embedding/querying fundamentals before RAG is integrated into
larger agentic tooling.

## Contributing

This project follows a strict branch-per-step workflow — see `CLAUDE.md` for
details. In short: one branch per discrete step, a PR per branch (using
`pull_request_template.md`), reviewed before merge.
