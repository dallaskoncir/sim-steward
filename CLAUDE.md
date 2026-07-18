# Sim Racing Steward RAG POC - Claude Project Brain

## General Development Rules
- Use TypeScript and Node.js.
- Ensure strict typing and modern ES modules (`"type": "module"` in package.json).
- Minimize external dependencies; stick to `chromadb`, `ollama`, and TS boilerplate.
- Leave comments explaining *why* something is done, especially regarding Chroma or vector math, rather than *what* is being done.

## Project Structure
- `src/ingest.ts`: Logic for reading `rulebook.md`, chunking text, generating embeddings via Ollama, and saving to Chroma.
- `src/query.ts`: Logic for taking user input, embedding it, querying Chroma, and formatting the output.
- `data/rulebook.md`: The sample sim racing penalty guidelines.

## Branch-per-Step Workflow
Like Flowlaps, adhere to a strict branch-per-step PR workflow:
1. **Branch creation**: Create a new branch for each discrete step (e.g., `feature/init-chroma`, `feature/ingestion-script`).
2. **Implementation**: Write the code, keeping the scope limited to the branch's purpose.
3. **Commit & Push**: Commit with clear, descriptive messages and push to the remote.
4. **PR & Review**: Open a PR. Use a subagent (or a fresh Claude context) to review the code.
5. **Merge**: Merge only after review and addressing comments.

## Agent Skills Policy
Use agent skills library selectively, keeping the context window focused:
- **Planning/Setup Branches**: `architecture-design`, `project-planning`.
- **Implementation Branches**: `source-driven-development`, `incremental-implementation`.
- **PR/Review Branches**: `code-review-and-quality`, `git-workflow-and-versioning`.
