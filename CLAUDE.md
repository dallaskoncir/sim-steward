# Sim Racing Steward RAG POC - Claude Project Brain

## General Development Rules
- Use TypeScript and Node.js.
- Ensure strict typing and modern ES modules (`"type": "module"` in package.json).
- Minimize external dependencies on the CLI/RAG side (`src/`); stick to `chromadb`, `ollama`, and TS boilerplate there. The Next.js web app (`app/`) has its own justified stack (`next`, `react`, `ai`/`@ai-sdk/react`, `tailwindcss`, `shadcn`) per PROJECT_BRIEF.md's Phase 5+ — don't add to *that* stack casually either, but it's a separate budget from the CLI's.
- Leave comments explaining *why* something is done, especially regarding Chroma or vector math, rather than *what* is being done.

## Project Structure
- `src/ingest.ts`: Logic for reading `rulebook.md`, chunking text, generating embeddings via Ollama, and saving to Chroma.
- `src/query.ts`: Logic for taking user input, embedding it, querying Chroma, and formatting the output.
- `data/rulebook.md`: The sample sim racing penalty guidelines.
- `app/page.tsx` + `app/api/chat/route.ts`: Next.js chat UI and streaming API route (see README.md's "Web App (Next.js)" section for the full breakdown, including why there are two `tsconfig*.json` files).

## Branch-per-Step Workflow
Like Flowlaps, adhere to a strict branch-per-step PR workflow:
1. **Branch creation**: Create a new branch for each discrete step (e.g., `feature/init-chroma`, `feature/ingestion-script`).
2. **Implementation**: Write the code, keeping the scope limited to the branch's purpose.
3. **Commit & Push**: Commit with clear, descriptive messages and push to the remote.
4. **PR & Review**: Open a PR. Use a subagent (or a fresh Claude context) to review the code.
5. **Merge**: Merge only after review and addressing comments.

## Agent Skills Policy
Use agent skills library selectively, keeping the context window focused:
- **Match the Skill to the Task**: Pick whichever installed skill best fits the work at hand rather than following a fixed branch-to-skill mapping.
- **Default to Installed Skills**: Before attempting to write custom scripts, scaffolding logic, or complex manual CLI commands, you MUST check for and utilize the installed skills from the Addy Osmani skill library.
- **Do Not Reinvent the Wheel**: If a task (like analyzing a repo, scaffolding a component, or managing git operations) can be accomplished using an existing installed skill, you are strictly required to invoke that skill rather than doing the work from scratch.

## Code Review Workflow
- **Strict Role Separation**: You act as my co-author (Claude) for writing code, committing, and opening PRs. However, the GitHub account `flowlaps-ai-reviewer` is strictly used as an independent reviewer.
- **Bot Token Usage**: When executing code reviews or posting review comments to a PR, you MUST authenticate using the `AI_BOT_GITHUB_TOKEN` environment variable so the feedback appears on GitHub as `flowlaps-ai-reviewer`. 
- **Subagent Pattern**: When asked to review a branch, spawn a fresh, read-only subagent. The subagent must authenticate using `AI_BOT_GITHUB_TOKEN` to post its review to the GitHub PR.
- **Review Scope**: The reviewer subagent must check for security, edge cases, error handling, tests, complexity, and quality. It must NOT modify files during the review pass.

## Self-Correcting Memory
- Before exiting a session, write a brief, 1-sentence bullet point to `.claude/memory/corrections.md` (relative to the repo root) documenting any architectural mistakes, syntax errors, or workflow violations you made that I had to manually correct.
- Always read `.claude/memory/corrections.md` at the start of every session to prevent repeating past mistakes.
