import { Ollama } from "ollama";

// PROJECT_BRIEF.md suggests llama3.2 or qwen2.5; phi4 was used instead
// since it was already pulled locally and neither suggested model was.
const CHAT_MODEL = "phi4";

export interface CitableRule {
  id: string;
  title: string;
  text: string;
}

const SYSTEM_PROMPT = [
  "You are a Sim Racing Steward. Explain the ruling based ONLY on the",
  "provided rules. You must cite your source using the exact Rule ID",
  "(e.g., [Rule 1.1]) for every penalty or determination you state. Do not",
  "invent rules, penalties, or details that are not in the provided rules.",
  "If the provided rules don't clearly cover the incident, say so instead",
  "of guessing.",
].join(" ");

// Pure prompt construction, kept separate from the Ollama call so it's
// unit testable without a live model — mirrors rerank.ts/rerank-scores.ts.
export function buildUserPrompt(incident: string, rules: CitableRule[]): string {
  const ruleList = rules.map((rule) => `[Rule ${rule.id}] ${rule.title}: ${rule.text}`).join("\n\n");
  return [
    `Incident: "${incident}"`,
    "",
    "Provided rules:",
    ruleList,
    "",
    "Explain the ruling for this incident, citing the exact Rule ID(s) that apply.",
  ].join("\n");
}

const ollama = new Ollama({ host: process.env.OLLAMA_HOST });

export async function generateRuling(incident: string, rules: CitableRule[]): Promise<string> {
  const response = await ollama.chat({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(incident, rules) },
    ],
  });
  return response.message.content;
}
