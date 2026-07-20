# ADR-003: Fuse stage-1 and stage-2 rankings via Reciprocal Rank Fusion instead of trusting the cross-encoder alone

## Status
Accepted

## Date
2026-07-20

## Context
Manual testing after Phase 3 (ADR-002) surfaced retrieval-quality bugs:
queries with an unambiguous correct rule were returning an unrelated one,
including the reported symptom of incidents unrelated to the pit lane
surfacing `3.1 Pit Speeding` / `3.2 Pit Exit Blending`.

Root-caused with a debug script that logged Chroma's stage-1 (dense
embedding) candidate order separately from the final output:
- For `"I was rammed on purpose after the race ended"`, stage 1 correctly
  ranked `4.2 Retaliation` #1 (distance 0.6974). The final answer was `2.1
  Unsafe Rejoin` — the cross-encoder (stage 2) had overridden a stage-1
  match that was already correct.
- Same pattern for `"contact was caused by lag, not the other driver's
  fault"`: stage 1 correctly ranked `4.3 Netcode Incidents` #1 (distance
  0.5581); the cross-encoder demoted it in favor of `1.1 The Vortex of
  Danger`.

Two things were verified before concluding this was a model-quality issue
rather than a code bug:
- The `text`/`text_pair` argument order passed to the tokenizer was checked
  against `cross-encoder/ms-marco-MiniLM-L6-v2`'s own model card usage
  example — it matches exactly (query as `text`, candidate as `text_pair`).
- `Xenova/ms-marco-MiniLM-L-6-v2`'s own published benchmark is ~39% MRR@10
  on MS MARCO — a general web-passage-ranking model that is, by its own
  numbers, an imperfect signal even in its home domain. It appears to key on
  superficial word overlap (e.g. "fast" → `Pit Speeding`) rather than
  domain-specific relevance on this rulebook's short, jargon-heavy text
  (`"drive-through"`, `"netcode"`, `"B-pillar"`).

Including the rule title alongside the body in the cross-encoder's input
(a same-day fix, see `src/query.ts`) was tried first as a low-risk
improvement — it nudged scores in the right direction but did not flip
either wrong answer, confirming title-inclusion alone was insufficient.

## Decision
Fuse stage-1 and stage-2 rankings with Reciprocal Rank Fusion (Cormack,
Clarke & Buettcher, 2009 — `score(d) = Σ 1/(k + rank(d))`, `k=60`, the
default used by production hybrid-search implementations e.g.
Elasticsearch) rather than sorting by the cross-encoder's score alone. A
rule the cross-encoder confidently demotes now has to overcome stage 1's
agreement to lose the top spot, instead of being dropped solely on stage
2's say-so.

RRF was chosen over a weighted blend of raw scores because Chroma's
distance (L2) and the cross-encoder's score (unbounded logits) have no
natural shared scale — a weighted blend would need per-query normalization
and a tuned weight, both extra surface area for a technique whose payoff
here is modest. RRF sidesteps that: it only uses each ranking's *position*,
which is always comparable regardless of how the underlying score is
computed.

## Alternatives Considered

### Weighted blend of normalized stage-1 distance and stage-2 score
- Pros: can weight one stage more heavily than the other if that's
  empirically justified
- Cons: L2 distance and cross-encoder logits have incompatible scales;
  normalizing either meaningfully (especially distance, whose range shifts
  with corpus/embedding model) requires either a fixed assumed range or
  min-max normalization within each small (10-item) candidate set, which is
  noisy at that size; introduces a weight to tune with no principled
  starting value
- Rejected: more moving parts than RRF for a comparable fix, and the tuning
  knob has no obvious correct default

### Swap to a larger/stronger cross-encoder (e.g. `Xenova/ms-marco-MiniLM-L-12-v2`)
- Pros: no new fusion logic; stays closest to the brief's literal "rank by
  cross-encoder score" wording
- Cons: L-12 vs L-6 is a marginal difference on MS MARCO's own benchmark
  (74.31 vs 74.30 NDCG@10) — the problem isn't model capacity, it's domain
  mismatch (a general web-passage ranker scored against a 10-rule sporting
  code), which a bigger model in the same family doesn't fix
- Rejected: the debug evidence pointed at domain mismatch, not model size,
  so this wouldn't have addressed the observed failures; not verified
  further since the reasoning already ruled it out

### Accept as a documented model limitation, no fix
- Pros: matches the brief's phrasing most literally; zero implementation
  risk
- Cons: leaves a verified, reproducible bug in place — a rule stage 1 already
  got right can still lose to a worse one solely because a bolted-on general
  reranker was confidently wrong
- Rejected: a fix existed that was proportionate in complexity to the
  problem; declining it would trade correctness for spec-literalism

## Consequences
- `src/query.ts`'s displayed "relevance" score was relabeled
  "cross-encoder score" — it's shown for reference, but final ranking order
  now comes from the RRF-fused rank, not from this score directly, so
  labeling it as *the* relevance score would misrepresent why a result was
  chosen.
- Two of the four incidents that surfaced this investigation remain
  unresolved by this change (`"I overtook someone going way too fast"` →
  `3.1 Pit Speeding`; `"collision at the start of the race"` → `3.2 Pit Exit
  Blending`) — verified via the same stage-1 debug script that *both*
  stage 1 and stage 2 independently rank those results first for those
  queries. This isn't a fusion or ranking bug: the sample rulebook has no
  rule describing an overtake being merely fast, or a race-start incident,
  so there's no better candidate for RRF to promote. Fixing this means
  expanding `data/rulebook.md`'s coverage, not changing the retrieval
  algorithm.
- `RRF_K = 60` is untuned beyond "it's the standard default" — if future
  testing surfaces cases where 60 over- or under-weights one stage, the
  parameter is already exposed (`fuseRankings(rankings, k)`) rather than
  hardcoded.
- **This is a two-sided tradeoff, not a one-directional fix.** Fusion
  dampens *any* case where one stage disagrees with the other, including
  the case ADR-002 added the cross-encoder for in the first place: stage 2
  correctly overriding a genuinely wrong stage-1 pick. Confirmed with a
  concrete example: for `"he stabbed the brakes for no reason to mess with
  me"` (expected `4.1 Brake Testing`), stage 1 alone got it wrong (`1.2`),
  stage 2 alone got it right (`4.1`), and the fused result reverted to the
  wrong stage-1 answer (`1.2`) — the exact regression this fusion approach
  risks. There is no tuning of `k` that eliminates this tradeoff; it can
  only shift how much weight one stage's opinion needs to override the
  other's. This PR's fix improves the specific failure mode it targeted
  (stage 2 wrongly overriding a correct stage 1) at a real, demonstrated
  cost to the opposite case (stage 2 rightly overriding a wrong stage 1).
