import { ChromaClient, ChromaNotFoundError } from "chromadb";
import { Ollama } from "ollama";
import { assertIncidentLength, assertSectionFormat } from "./validate.ts";
import { parseQueryArgs } from "./parse-args.ts";
import { rerank } from "./rerank.ts";
import type { RerankCandidate } from "./rerank-scores.ts";

interface RuleMetadata {
  title: string;
  section: string;
  sectionNumber: string;
  [key: string]: string;
}

const EMBED_MODEL = "nomic-embed-text";
const COLLECTION_NAME = "rulebook";
// Two-stage retrieval: pull a wider candidate set from Chroma's fast dense
// embedding search (stage 1), then let the slower, more accurate
// cross-encoder (stage 2) narrow it down to the results we actually show.
const INITIAL_K = 10;
const FINAL_K = 2;
// No real risk locally (OLLAMA_HOST is always our own machine), but caps
// the embed call's input size in case OLLAMA_HOST is ever pointed at a
// shared/remote endpoint.
const MAX_INCIDENT_LENGTH = 2000;

const ollama = new Ollama({ host: process.env.OLLAMA_HOST });
const chroma = new ChromaClient({
  host: process.env.CHROMA_HOST ?? "localhost",
  port: process.env.CHROMA_PORT ? Number(process.env.CHROMA_PORT) : 8000,
});

interface DisplayResult {
  id: string;
  text: string;
  score: number;
  metadata: RuleMetadata | null;
}

// Shows the cross-encoder's relevance score, not Chroma's vector distance —
// the reranked order (and thus the Top FINAL_K cut) is determined by the
// former, so labeling results with the latter would misrepresent why they
// were chosen.
function formatResults(results: DisplayResult[]): string {
  if (results.length === 0) return "No matching rules found.";

  return results
    .map((result, i) => {
      const meta = result.metadata;
      const header = meta ? `[${result.id}] ${meta.title}  (${meta.section})` : `[${result.id}]`;
      return `${i + 1}. ${header}  [relevance: ${result.score.toFixed(4)}]\n${result.text}`;
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
    nResults: INITIAL_K,
    where: section ? { sectionNumber: section } : undefined,
  });

  const ids = results.ids[0]!;
  const documents = results.documents[0]!;
  const metadatas = results.metadatas[0]!;
  const metadataById = new Map(ids.map((id, i) => [id, metadatas[i] ?? null]));

  const candidates: RerankCandidate[] = ids.map((id, i) => ({ id, text: documents[i] ?? "" }));
  const reranked = await rerank(incident, candidates);
  const displayResults: DisplayResult[] = reranked
    .slice(0, FINAL_K)
    .map((r) => ({ ...r, metadata: metadataById.get(r.id) ?? null }));

  const sectionSuffix = section ? ` (section: ${section})` : "";
  console.log(`Incident: "${incident}"${sectionSuffix}\n`);
  console.log(formatResults(displayResults));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
