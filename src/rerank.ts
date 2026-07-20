import { AutoModelForSequenceClassification, AutoTokenizer } from "@huggingface/transformers";
import { buildPairs, combineScores, type RerankCandidate, type RerankedResult } from "./rerank-scores.ts";

// Source: https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2 — ONNX port
// of cross-encoder/ms-marco-MiniLM-L-6-v2 for use with Transformers.js.
const MODEL_NAME = "Xenova/ms-marco-MiniLM-L-6-v2";
// Pinned to the model repo's current commit SHA (rather than floating on its
// default branch) so a future upstream model swap can't silently change
// query results underneath us. See docs/decisions/0002-cross-encoder-reranking.md.
const MODEL_REVISION = "a09144355adeed5f58c8ed011d209bf8ee5a1fec";

// Loaded lazily (not at module scope) and memoized, so importing this module
// — e.g. from rerank-scores.test.ts's sibling tests — never triggers a
// multi-hundred-MB model download as a side effect.
let modelPromise: ReturnType<typeof AutoModelForSequenceClassification.from_pretrained> | undefined;
let tokenizerPromise: ReturnType<typeof AutoTokenizer.from_pretrained> | undefined;

function loadModel() {
  modelPromise ??= AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, { revision: MODEL_REVISION });
  return modelPromise;
}

function loadTokenizer() {
  tokenizerPromise ??= AutoTokenizer.from_pretrained(MODEL_NAME, { revision: MODEL_REVISION });
  return tokenizerPromise;
}

// Two-stage retrieval, stage 2: nomic-embed-text's dense embeddings (stage 1,
// in query.ts) score each candidate independently and can miss nuanced
// relational context between the incident and a rule's exact wording. A
// cross-encoder scores the query and each candidate together in one forward
// pass — slower, so it only runs over Chroma's already-narrowed top-N
// candidates, not the whole collection.
export async function rerank(query: string, candidates: RerankCandidate[]): Promise<RerankedResult[]> {
  if (candidates.length === 0) return [];

  const [model, tokenizer] = await Promise.all([loadModel(), loadTokenizer()]);

  // Source: https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2#usage-transformersjs
  // — pairs the query with each candidate via text/text_pair, one pair per
  // candidate; output is logits of shape [candidates.length, 1].
  const { text, text_pair } = buildPairs(query, candidates);
  const features = tokenizer(text, { text_pair, padding: true, truncation: true });
  const { logits } = await model(features);

  return combineScores(candidates, Array.from(logits.data as Float32Array));
}
