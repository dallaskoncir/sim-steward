# Sim Racing Steward RAG POC (steward-rag-poc)

## The Concept
A local, CLI-based tool designed for sim racing leagues that indexes complex PDF/Markdown sporting codes and penalty guidelines. You feed it a plain-English or slang description of an on-track incident (e.g., "divebomb"), and it instantly retrieves the specific rule infractions and recommended penalty ranges.

## The Goal
To build a highly scoped, weekend-sized Proof of Concept (POC) using TypeScript, Node.js, and a local Vector Database (Chroma) to understand the fundamentals of chunking, embedding, and querying before integrating RAG into larger agentic tools (like Scrutineer).

## The Tech Stack
- **Language**: TypeScript (Node.js)
- **Vector DB**: Chroma (Local instance via `chromadb` npm package v3+)
- **Embeddings**: Ollama (`nomic-embed-text`)
- **CLI Interface**: Commander (or standard stdin/stdout for MVP)
- **File Parsing**: Standard Node `fs` (for Markdown/txt rulebooks)

## MVP Scope
1. A script to chunk and ingest a sample `rulebook.md` into Chroma using Ollama embeddings.
2. A CLI script to query the database with an incident report and log the closest matching rules to the terminal.
