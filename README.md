# sim-steward

A local, CLI-based RAG proof of concept for sim racing leagues. Feed it a
plain-English description of an on-track incident (e.g. "divebomb into turn
1") and it retrieves the closest matching rules from a penalty rulebook.

Chunks and embeds `data/rulebook.md` into a local [Chroma](https://www.trychroma.com/)
vector database using [Ollama](https://ollama.com/) embeddings, then lets you
query it from the command line.

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
This chunks `data/rulebook.md` by rule heading, embeds each chunk, and
(re)builds the `rulebook` collection in Chroma.

### Query
```
npm run query -- "divebomb into turn 1 that put another car in the wall"
```
Returns the top 3 closest-matching rules with their vector distance.

## Commands

| Command | Description |
|---|---|
| `npm run ingest` | Chunk `data/rulebook.md` and load it into Chroma |
| `npm run query -- "<incident>"` | Embed an incident description and retrieve matching rules |
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

- `src/chunk.ts` — splits the rulebook markdown into one chunk per `## `
  heading, so each retrieved chunk is a complete rule (trigger + penalty).
- `src/validate.ts` — input validation shared by ingest/query (e.g. incident
  length cap).
- `src/ingest.ts` — reads the rulebook, embeds chunks via Ollama, and
  rebuilds the `rulebook` collection in Chroma from scratch on every run.
- `src/query.ts` — embeds a CLI-supplied incident description and queries
  Chroma for the top 3 nearest rules.
- `data/rulebook.md` — sample sporting code used as the source of truth.

This is a scoped, weekend-sized POC (see `PROJECT_BRIEF.md`) meant to prove
out chunking/embedding/querying fundamentals before RAG is integrated into
larger agentic tooling.

## Contributing

This project follows a strict branch-per-step workflow — see `CLAUDE.md` for
details. In short: one branch per discrete step, a PR per branch (using
`pull_request_template.md`), reviewed before merge.
