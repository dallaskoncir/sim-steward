import { unified } from "unified";
import remarkParse from "remark-parse";
import { toString as nodeToString } from "mdast-util-to-string";
import type { Root } from "mdast";

export interface Rule {
  id: string; // e.g. "1.1", also used as the Chroma record ID and citation ID
  title: string; // e.g. "The Vortex of Danger"
  section: string; // full heading text, e.g. "1.0 Overtaking and Defending"
  sectionNumber: string; // e.g. "1.0", used for --section filtering
  text: string; // rule body, e.g. "If an attacking car attempts a pass ... Penalty: 10s to Drive-Through."
}

const SECTION_HEADING = /^(\d+\.\d+)\s+(.+)$/;
const RULE_ITEM = /^(\d+\.\d+)\s+(.+?):\s*(.*)$/s;

const parser = unified().use(remarkParse);

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
      const match = SECTION_HEADING.exec(nodeToString(node));
      if (match) currentSection = { number: match[1]!, heading: match[2]! };
      continue;
    }

    if (node.type === "list" && currentSection) {
      for (const item of node.children) {
        const match = RULE_ITEM.exec(nodeToString(item));
        if (!match) continue;
        const [, id, title, text] = match;
        rules.push({
          id: id!,
          title: title!,
          section: `${currentSection.number} ${currentSection.heading}`,
          sectionNumber: currentSection.number,
          text: text!.trim(),
        });
      }
    }
  }

  return rules;
}
