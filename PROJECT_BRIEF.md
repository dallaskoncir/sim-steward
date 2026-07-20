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

## Expansion Phases: Advanced RAG Architecture
To elevate this POC from a basic semantic search to a production-grade Agentic RAG system, the following phases must be implemented in order:

### Phase 2: Metadata Extraction & Filtered Retrieval
Instead of chunking the `rulebook.md` blindly, the ingestion script must become context-aware.
- **The Upgrade:** Implement an AST (Abstract Syntax Tree) markdown parser using `unified` and `remark-parse` to traverse the document. 
- **The Execution:** When chunking, extract the `##` headers as metadata (e.g., `section: "1.0 Overtaking and Defending"`). Inject this metadata into Chroma.
- **The Goal:** Update the CLI to accept an optional `--section` flag, allowing the steward to pre-filter the vector search before embedding similarity is calculated.

### Phase 3: Cross-Encoder Re-Ranking (Two-Stage Retrieval)
Standard dense embeddings (`nomic-embed-text`) are fast but sometimes fail on nuanced sentence relationships. We will implement a two-stage retrieval pipeline.
- **The Upgrade:** Integrate `@huggingface/transformers` to run a lightweight, local Cross-Encoder model (like `Xenova/ms-marco-MiniLM-L-6-v2`) entirely in Node.js.
- **The Execution:** Update the query script to pull the top 10 results from Chroma. Then, pass the user's query and those 10 rules simultaneously through the Cross-Encoder to re-score and re-rank them based on exact relational context.
- **The Goal:** Output only the mathematically superior Top 2 results to ensure the agent receives the most precise context possible.

### Phase 4: Generation with Grounded Citations
A vector search returning text is not an agent. The tool must explain its ruling and explicitly prove where it got the answer.
- **The Upgrade:** Hook the output of Phase 3 into a local chat model via Ollama (e.g., `llama3.2` or `qwen2.5`). 
- **The Execution:** Format the system prompt to include the Top 2 retrieved rules alongside their IDs. Instruct the model: *"You are a Sim Racing Steward. Explain the ruling based ONLY on the provided rules. You must cite your source using the exact Rule ID (e.g., [Rule 1.1])."*
- **The Goal:** The final CLI output should look like a human steward's penalty assessment, complete with inline citations, preventing LLM hallucinations.
