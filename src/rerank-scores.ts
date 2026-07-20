export interface RerankCandidate {
  id: string;
  text: string;
}

export interface RerankedResult extends RerankCandidate {
  score: number;
}

// Cross-encoder scores are raw logits (higher = more relevant), not
// probabilities, so there's no fixed threshold to filter on — only a
// relative ordering, which is why we sort rather than filter.
export function combineScores(candidates: RerankCandidate[], scores: number[]): RerankedResult[] {
  return candidates
    .map((candidate, i) => ({ ...candidate, score: scores[i]! }))
    .sort((a, b) => b.score - a.score);
}
