import type { MockProviderConfig } from "./provider.ts";
import type { AIProvider, AIChatRequest, AIChatResponse, AIChatStreamChunk } from "./types.ts";

export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  private counter = 0;

  constructor(private readonly config: MockProviderConfig = {}) {}

  chat(request: AIChatRequest): Promise<AIChatResponse> {
    this.counter++;
    const id = `mock-${this.counter}`;

    if (request.jsonMode && this.config.scannerJsonResponse) {
      const content = this.config.scannerJsonResponse;
      return Promise.resolve({
        id,
        model: request.model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content },
            finishReason: "stop",
          },
        ],
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      });
    }

    const content = this.config.defaultContent || "Mock response from AI provider.";

    return Promise.resolve({
      id,
      model: request.model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finishReason: "stop",
        },
      ],
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
    });
  }

  *streamChat(request: AIChatRequest, signal?: AbortSignal): AsyncIterable<AIChatStreamChunk> {
    const chunkSize = this.config.streamChunkSize || 12;

    if (!request.messages.length) {
      return;
    }

    const lastMessage = request.messages[request.messages.length - 1];
    const text = typeof lastMessage.content === "string" ? lastMessage.content : lastMessage.content[0]?.text || "";
    const parts: string[] = [];
    let offset = 0;

    while (offset < text.length) {
      if (signal?.aborted) {
        return;
      }

      const chunk = text.slice(offset, offset + chunkSize);
      parts.push(chunk);
      offset += chunkSize;

      yield {
        delta: chunk,
        finishReason: null,
      };
    }

    if (!signal?.aborted) {
      yield {
        delta: "",
        finishReason: "stop",
      };
    }
  }
}
