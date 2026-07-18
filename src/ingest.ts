import { readFile } from "node:fs/promises";
import { ChromaClient, ChromaNotFoundError } from "chromadb";
import { Ollama } from "ollama";
import { chunkByHeading } from "./chunk.ts";

const EMBED_MODEL = "nomic-embed-text";
const COLLECTION_NAME = "rulebook";
const RULEBOOK_PATH = new URL("../data/rulebook.md", import.meta.url);

// The ollama npm client, unlike the CLI, does not read OLLAMA_HOST from the
// environment on its own — it defaults to 127.0.0.1, which breaks under WSL2
// where Ollama runs on the Windows host reachable via a gateway IP.
const ollama = new Ollama({ host: process.env.OLLAMA_HOST });
// Local Chroma server, e.g. `chroma run --path ./chroma-data`. Overridable
// the same way as OLLAMA_HOST above, since Chroma can run outside WSL2 too.
const chroma = new ChromaClient({
  host: process.env.CHROMA_HOST ?? "localhost",
  port: process.env.CHROMA_PORT ? Number(process.env.CHROMA_PORT) : 8000,
});

async function main() {
  const markdown = await readFile(RULEBOOK_PATH, "utf-8");
  const chunks = chunkByHeading(markdown);

  const { embeddings } = await ollama.embed({
    model: EMBED_MODEL,
    input: chunks,
  });

  // rule-${i} IDs are positional: if a rule is reordered or removed between
  // runs, add()/upsert() by ID would leave stale or misassigned vectors
  // behind. The rulebook is small and static, so the simplest correct fix
  // is a full rebuild on every ingest rather than tracking per-rule identity.
  try {
    await chroma.deleteCollection({ name: COLLECTION_NAME });
  } catch (err) {
    if (!(err instanceof ChromaNotFoundError)) throw err;
  }

  // We pass embeddings we generated ourselves, so no embeddingFunction is
  // needed on the collection — Chroma just stores and indexes the vectors.
  // NOTE: the chromadb client logs a harmless "Cannot instantiate a
  // collection with the DefaultEmbeddingFunction" warning here even with
  // embeddingFunction: null, because it uses `??` (not a null check) when
  // resolving the collection's EF from server state. Silencing it properly
  // would require installing @chroma-core/default-embed, which pulls in
  // sharp/onnxruntime-node — not worth it since we never use that EF; we
  // supply embeddings ourselves below.
  const collection = await chroma.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction: null,
  });

  await collection.add({
    ids: chunks.map((_, i) => `rule-${i}`),
    embeddings,
    documents: chunks,
  });

  console.log(`Ingested ${chunks.length} chunks into "${COLLECTION_NAME}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
