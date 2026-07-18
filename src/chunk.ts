// Chunk by "## " heading so each penalty rule stays a single, semantically
// complete unit — splitting mid-rule would let the retriever return half a
// penalty without its trigger condition or vice versa. The text before the
// first "## " (the top-level "# ..." title) isn't a rule, so it's dropped.
export function chunkByHeading(markdown: string): string[] {
  return markdown
    .split(/\n(?=## )/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith("## "));
}
