import { ChromaClient, ChromaNotFoundError } from "chromadb";
import { Ollama } from "ollama";
import { assertIncidentLength, assertSectionFormat } from "./validate.ts";
import { parseQueryArgs } from "./parse-args.ts";
import { rerank } from "./rerank.ts";
import type { RerankCandidate } from "./rerank-scores.ts";
import { fuseRankings } from "./fuse-rankings.ts";
import { generateRuling } from "./generate.ts";

interface RuleMetadata {
  title: string;
  section: string;
  sectionNumber: string;
  [key: string]: string;
}

const EMBED_MODEL = "nomic-embed-text";
const COLLECTION_NAME = "rulebook";
// Two-stage retrieval: pull a wider candidate set from Chroma's fast dense
// embedding search (stage 1), then re-score with a slower, more accurate
// cross-encoder (stage 2). The two rankings are fused via Reciprocal Rank
// Fusion rather than trusting stage 2 alone — Xenova/ms-marco-MiniLM-L-6-v2
// is a general web-passage reranker, not tuned for short, jargon-heavy
// regulatory text, and was observed to confidently demote a rule stage 1
// already ranked correctly (e.g. surfacing "Pit Speeding" for a query about
// an unsafe overtake, purely on the word "fast"). See fuse-rankings.ts.
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

// Final order comes from fusing stage-1 and stage-2 rankings (see
// fuseRankings below), not from the cross-encoder score alone — so it's
// shown labeled as its own signal, not as "the" relevance score.
function formatResults(results: DisplayResult[]): string {
  if (results.length === 0) return "No matching rules found.";

  return results
    .map((result, i) => {
      const meta = result.metadata;
      const header = meta ? `[${result.id}] ${meta.title}  (${meta.section})` : `[${result.id}]`;
      return `${i + 1}. ${header}  [cross-encoder score: ${result.score.toFixed(4)}]\n${result.text}`;
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
  const documentById = new Map(ids.map((id, i) => [id, documents[i] ?? ""]));

  // Score title + body, not body alone: the title (e.g. "Retaliation",
  // "Netcode Incidents") is already part of what's embedded in stage 1 (see
  // ingest.ts), and gives the cross-encoder the same signal instead of only
  // the terse rule body, which can otherwise read as generic out of context.
  const candidates: RerankCandidate[] = ids.map((id) => {
    const meta = metadataById.get(id);
    const body = documentById.get(id) ?? "";
    return { id, text: meta ? `${meta.title}. ${body}` : body };
  });
  const reranked = await rerank(incident, candidates);
  const scoreById = new Map(reranked.map((r) => [r.id, r.score]));

  // ids is already Chroma's distance-sorted order (stage 1); reranked is the
  // cross-encoder's score-sorted order (stage 2). Fusing them means a rule
  // the cross-encoder confidently — but wrongly — demotes still has to
  // overcome stage 1's agreement, rather than being dropped solely on stage
  // 2's say-so.
  const fusedOrder = fuseRankings([ids, reranked.map((r) => r.id)]);
  const displayResults: DisplayResult[] = fusedOrder.slice(0, FINAL_K).map((id) => ({
    id,
    score: scoreById.get(id) ?? 0,
    text: documentById.get(id) ?? "",
    metadata: metadataById.get(id) ?? null,
  }));

  const sectionSuffix = section ? ` (section: ${section})` : "";
  console.log(`Incident: "${incident}"${sectionSuffix}\n`);

  if (displayResults.length === 0) {
    console.log(formatResults(displayResults));
    return;
  }

  // Grounded generation: the model only ever sees the retrieved rule text
  // and is instructed to cite by exact Rule ID, so its explanation can be
  // checked against — not just trusted alongside — the rules printed below.
  const ruling = await generateRuling(
    incident,
    displayResults.map((r) => ({ id: r.id, title: r.metadata?.title ?? "", text: r.text })),
  );
  console.log(`Ruling:\n${ruling}\n`);
  console.log(`Retrieved Rules:\n${formatResults(displayResults)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
