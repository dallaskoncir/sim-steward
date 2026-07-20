export interface RerankCandidate {
  id: string;
  text: string;
}

export interface RerankedResult extends RerankCandidate {
  score: number;
}

export interface TokenizerPairs {
  text: string[];
  text_pair: string[];
}

// The cross-encoder tokenizer takes parallel text/text_pair arrays — text[i]
// paired with text_pair[i] — not a single (query, candidate) tuple per call.
// Extracted as its own pure function so a silent argument-order swap (query
// and candidate text switched) is caught by a unit test instead of only
// showing up as degraded rerank quality against the live model.
export function buildPairs(query: string, candidates: RerankCandidate[]): TokenizerPairs {
  return {
    text: candidates.map(() => query),
    text_pair: candidates.map((candidate) => candidate.text),
  };
}

// Cross-encoder scores are raw logits (higher = more relevant), not
// probabilities, so there's no fixed threshold to filter on — only a
// relative ordering, which is why we sort rather than filter.
export function combineScores(candidates: RerankCandidate[], scores: number[]): RerankedResult[] {
  return candidates
    .map((candidate, i) => ({ ...candidate, score: scores[i]! }))
    .sort((a, b) => b.score - a.score);
}
