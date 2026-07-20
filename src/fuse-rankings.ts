// Reciprocal Rank Fusion (Cormack, Clarke & Buettcher, 2009) — combines
// multiple rankings of the same item set into one, using only each ranking's
// *position* for an item, not its raw score. Chosen over a weighted blend of
// raw scores because Chroma's stage-1 distance (L2) and the stage-2
// cross-encoder's score (unbounded logits) live in incompatible unit
// systems with no natural shared scale; rank position is always comparable
// across any two ranking methods, however they compute their scores.
//
// k=60 is the standard default from the original paper, also used as the
// default by production hybrid-search implementations (e.g. Elasticsearch).
// Source: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion
export const RRF_K = 60;

// Items absent from a given ranking simply don't get that ranking's
// contribution to their score — they aren't penalized beyond that.
export function fuseRankings(rankings: string[][], k: number = RRF_K): string[] {
  const scores = new Map<string, number>();

  for (const ranking of rankings) {
    ranking.forEach((id, index) => {
      const rank = index + 1;
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank));
    });
  }

  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
