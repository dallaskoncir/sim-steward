import { ChromaClient, ChromaNotFoundError } from "chromadb";
import { Ollama } from "ollama";
import { assertIncidentLength, assertSectionFormat } from "./validate.ts";
import { parseQueryArgs } from "./parse-args.ts";

interface RuleMetadata {
  title: string;
  section: string;
  sectionNumber: string;
  [key: string]: string;
}

const EMBED_MODEL = "nomic-embed-text";
const COLLECTION_NAME = "rulebook";
const TOP_K = 3;
// No real risk locally (OLLAMA_HOST is always our own machine), but caps
// the embed call's input size in case OLLAMA_HOST is ever pointed at a
// shared/remote endpoint.
const MAX_INCIDENT_LENGTH = 2000;

const ollama = new Ollama({ host: process.env.OLLAMA_HOST });
const chroma = new ChromaClient({
  host: process.env.CHROMA_HOST ?? "localhost",
  port: process.env.CHROMA_PORT ? Number(process.env.CHROMA_PORT) : 8000,
});

function formatResults(
  ids: string[],
  documents: (string | null)[],
  metadatas: (RuleMetadata | null)[],
  distances: (number | null)[],
): string {
  if (documents.length === 0) return "No matching rules found.";

  return documents
    .map((doc, i) => {
      const meta = metadatas[i];
      const distance = distances[i];
      const header = meta ? `[${ids[i]}] ${meta.title}  (${meta.section})` : `[${ids[i]}]`;
      return `${i + 1}. ${header}  [distance: ${distance?.toFixed(4) ?? "n/a"}]\n${doc ?? "(no content)"}`;
    })
    .join("\n\n");
}

async function main() {
  const { incident, section } = parseQueryArgs(process.argv.slice(2));
  if (!incident) {
    console.error('Usage: npm run query -- "description of the incident" [--section 2.0]');
    process.exit(1);
  }
  try {
    assertIncidentLength(incident, MAX_INCIDENT_LENGTH);
    if (section) assertSectionFormat(section);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
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

  const results = await collection.query<RuleMetadata>({
    queryEmbeddings: embeddings,
    nResults: TOP_K,
    where: section ? { sectionNumber: section } : undefined,
  });

  const sectionSuffix = section ? ` (section: ${section})` : "";
  console.log(`Incident: "${incident}"${sectionSuffix}\n`);
  console.log(formatResults(results.ids[0]!, results.documents[0]!, results.metadatas[0]!, results.distances[0]!));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
