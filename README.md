# sim-steward

A local, CLI-based RAG proof of concept for sim racing leagues. Feed it a
plain-English description of an on-track incident (e.g. "divebomb into turn
1") and it retrieves the closest matching rules from a penalty rulebook.

Parses `data/rulebook.md` into individual numbered rules (e.g. `1.1 The Vortex
of Danger`), embeds each one via [Ollama](https://ollama.com/), and stores
them — along with their section metadata — in a local
[Chroma](https://www.trychroma.com/) vector database. Querying is two-stage:
Chroma's dense embedding search narrows the rulebook down to a candidate set,
then a local cross-encoder ([transformers.js](https://huggingface.co/docs/transformers.js))
re-scores those candidates against the incident text. The two rankings are
combined via Reciprocal Rank Fusion rather than trusting the cross-encoder
alone — see [ADR-003](docs/decisions/0003-rrf-fuse-retrieval-rankings.md)
for why. The top 2 rules are then handed to a local chat model, which
explains the ruling in plain English and must cite its source by exact
Rule ID (e.g. `[Rule 1.1]`) — grounded in the retrieved text rather than
free-form, and checkable against the rules printed alongside it.

## Quick Start

### Prerequisites
- Node.js 20+ (required by the `chromadb` client)
- [Ollama](https://ollama.com/) running locally, with the embedding and
  chat models pulled:
  ```
  ollama pull nomic-embed-text
  ollama pull phi4
  ```
  `phi4` is ~9GB — see [ADR-004](docs/decisions/0004-chat-model-choice.md)
  for why it's used instead of PROJECT_BRIEF.md's suggested `llama3.2`/
  `qwen2.5` (swapping is a one-line change in `src/generate.ts` if you'd
  rather pull one of those instead).
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
Pulls the top 10 candidates from Chroma, re-ranks them with a local
cross-encoder, fuses that ranking with Chroma's original one, and hands the
top 2 to a local chat model that explains the ruling and cites its source
by exact Rule ID — the retrieved rules are printed underneath so the
citations are checkable, not just trusted. The first query run downloads
and caches the cross-encoder model (~88MB, under
`node_modules/@huggingface/transformers/.cache/` — wiped and re-downloaded
on a fresh `npm install`).

Pre-filter to a specific rulebook section (skips embedding-similarity search
outside it) with `--section`:
```
npm run query -- "brake tested me on the straight" --section 4.0
```

## Commands

| Command | Description |
|---|---|
| `npm run ingest` | Parse `data/rulebook.md` into rules and load them into Chroma |
| `npm run query -- "<incident>" [--section <n.0>]` | Retrieve, rerank, and generate a cited ruling for an incident, optionally pre-filtered to one rulebook section |
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
  pre-filters by section metadata, pulls the top 10 nearest rules from
  Chroma, re-ranks them with a cross-encoder, fuses both rankings, and
  hands the top 2 to `generate.ts` for a cited ruling.
- `src/rerank-scores.ts` — pure scoring/sorting logic for the re-rank step
  (unit tested without loading the model).
- `src/rerank.ts` — loads the local cross-encoder
  ([`Xenova/ms-marco-MiniLM-L-6-v2`](https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2)
  via `@huggingface/transformers`) and scores the incident against each
  Chroma candidate.
- `src/fuse-rankings.ts` — combines Chroma's and the cross-encoder's
  rankings via Reciprocal Rank Fusion, so a rule the cross-encoder demotes
  still has to overcome Chroma's agreement to lose the top spot (see
  ADR-003).
- `src/generate.ts` — builds a prompt from the top 2 retrieved rules and
  asks a local chat model (`phi4`, see ADR-004) to explain the ruling,
  citing by exact Rule ID and instructed not to invent rules or details.
  Prompt construction is pure and unit tested separately from the Ollama
  call itself.
- `data/rulebook.md` — sample sporting code used as the source of truth.

This is a scoped, weekend-sized POC (see `PROJECT_BRIEF.md`) meant to prove
out chunking/embedding/querying fundamentals before RAG is integrated into
larger agentic tooling.

## Contributing

This project follows a strict branch-per-step workflow — see `CLAUDE.md` for
details. In short: one branch per discrete step, a PR per branch (using
`pull_request_template.md`), reviewed before merge.

This repo's `.mcp.json` configures the [chrome-devtools MCP
server](https://github.com/ChromeDevTools/chrome-devtools-mcp) for agents
(e.g. Claude Code) doing UI work. It requires a locally installed Chrome —
it does not download one itself:
```
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install ./google-chrome-stable_current_amd64.deb
```
