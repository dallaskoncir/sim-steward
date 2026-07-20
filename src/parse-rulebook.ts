import { unified } from "unified";
import remarkParse from "remark-parse";
import { toString as nodeToString } from "mdast-util-to-string";
import type { ListItem, Root } from "mdast";

export interface Rule {
  id: string; // e.g. "1.1", also used as the Chroma record ID and citation ID
  title: string; // e.g. "The Vortex of Danger"
  section: string; // full heading text, e.g. "1.0 Overtaking and Defending"
  sectionNumber: string; // e.g. "1.0", used for --section filtering
  text: string; // rule body, e.g. "If an attacking car attempts a pass ... Penalty: 10s to Drive-Through."
}

const SECTION_HEADING = /^(\d+\.\d+)\s+(.+)$/;
// Matched against the bold node's own text only (see extractRule below), so
// the trailing ":" reliably marks the end of the title even when the title
// itself contains a colon (e.g. "4.4 Blue Flags: Right of Way:").
const RULE_ID_TITLE = /^(\d+\.\d+)\s+(.+):$/s;

const parser = unified().use(remarkParse);

// A rule item is "**<id> <title>:** <body>" — the id/title live in a bold
// node and the body is everything after it. Splitting on the bold node's
// boundary (rather than regexing the flattened item text for the first or
// last colon) means a colon inside the title can't be confused with the one
// that ends it.
function extractRule(item: ListItem): Pick<Rule, "id" | "title" | "text"> | undefined {
  const paragraph = item.children.find((child) => child.type === "paragraph");
  if (!paragraph) return undefined;

  const [lead, ...rest] = paragraph.children;
  if (!lead || lead.type !== "strong") return undefined;

  const match = RULE_ID_TITLE.exec(nodeToString(lead));
  if (!match) return undefined;

  return {
    id: match[1]!,
    title: match[2]!,
    text: rest.map((node) => nodeToString(node)).join("").trim(),
  };
}

// Each ## heading is a numbered section ("1.0 Overtaking and Defending")
// followed by a list of numbered rules ("1.1 The Vortex of Danger: ...").
// We track the current section while walking the AST in document order and
// attach it to every rule beneath it, so a rule never loses its section
// context even though the markdown only states it once, in the heading.
export function parseRulebook(markdown: string): Rule[] {
  const tree = parser.parse(markdown) as Root;
  const rules: Rule[] = [];

  let currentSection: { number: string; heading: string } | undefined;

  for (const node of tree.children) {
    if (node.type === "heading" && node.depth === 2) {
      // Reset (rather than leave stale) on a non-numbered heading, so a
      // section like "## Notes" can't cause rules beneath it to be
      // mis-tagged with whatever numbered section preceded it.
      const match = SECTION_HEADING.exec(nodeToString(node));
      currentSection = match ? { number: match[1]!, heading: match[2]! } : undefined;
      continue;
    }

    if (node.type === "list" && currentSection) {
      for (const item of node.children) {
        const rule = extractRule(item);
        if (!rule) continue;
        rules.push({
          ...rule,
          section: `${currentSection.number} ${currentSection.heading}`,
          sectionNumber: currentSection.number,
        });
      }
    }
  }

  return rules;
}
