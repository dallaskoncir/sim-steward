import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  simulateReadableStream,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { MockLanguageModelV4 } from "ai/test";

export const maxDuration = 30;

// Phase 5's goal is to prove the Vercel AI SDK streaming architecture and
// frontend state management work before Phase 6 wires in the real
// Chroma/Ollama RAG pipeline. MockLanguageModelV4 + simulateReadableStream
// is the AI SDK's own documented way to stream a canned response without a
// real provider. Source: https://ai-sdk.dev/docs/ai-sdk-core/testing
const MOCK_RESPONSE =
  "This is a placeholder ruling from the mock chat route. Once Phase 6 wires " +
  "in the real retrieval pipeline, this will cite the actual rulebook " +
  "(e.g. [Rule 1.1]) instead of streaming static text.";

function toMockStreamChunks(text: string) {
  const words = text.split(" ");
  return [
    { type: "text-start" as const, id: "text-1" },
    ...words.map((word, index) => ({
      type: "text-delta" as const,
      id: "text-1",
      delta: index === 0 ? word : ` ${word}`,
    })),
    { type: "text-end" as const, id: "text-1" },
    {
      type: "finish" as const,
      finishReason: { unified: "stop" as const, raw: undefined },
      usage: {
        inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: words.length, text: words.length, reasoning: undefined },
      },
    },
  ];
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: toMockStreamChunks(MOCK_RESPONSE),
          chunkDelayInMs: 30,
        }),
      }),
    }),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
