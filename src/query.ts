import { ChromaClient, ChromaNotFoundError } from "chromadb";
import { Ollama } from "ollama";

const EMBED_MODEL = "nomic-embed-text";
const COLLECTION_NAME = "rulebook";
const TOP_K = 3;

const ollama = new Ollama({ host: process.env.OLLAMA_HOST });
const chroma = new ChromaClient({
  host: process.env.CHROMA_HOST ?? "localhost",
  port: process.env.CHROMA_PORT ? Number(process.env.CHROMA_PORT) : 8000,
});

function formatResults(documents: (string | null)[], distances: (number | null)[]): string {
  return documents
    .map((doc, i) => {
      const distance = distances[i];
      const [heading, ...body] = (doc ?? "(no content)").split("\n");
      return `${i + 1}. ${heading?.replace(/^## /, "")}  [distance: ${distance?.toFixed(4) ?? "n/a"}]\n${body.join("\n")}`;
    })
    .join("\n\n");
}

async function main() {
  const incident = process.argv.slice(2).join(" ").trim();
  if (!incident) {
    console.error('Usage: npm run query -- "description of the incident"');
    process.exit(1);
  }

  let collection;
  try {
    collection = await chroma.getCollection({ name: COLLECTION_NAME });
  } catch (err) {
    if (err instanceof ChromaNotFoundError) {
      console.error(`Collection "${COLLECTION_NAME}" not found. Run \`npm run ingest\` first.`);
      process.exit(1);
    }
    throw err;
  }

  const { embeddings } = await ollama.embed({
    model: EMBED_MODEL,
    input: [incident],
  });

  const results = await collection.query({
    queryEmbeddings: embeddings,
    nResults: TOP_K,
  });

  console.log(`Incident: "${incident}"\n`);
  console.log(formatResults(results.documents[0], results.distances[0]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
