import type { AIProvider, AIChatRequest, AIChatResponse, AIChatStreamChunk, AIProviderError } from "./types.ts";

export interface OpenAIProviderConfig {
  apiKey: string;
  defaultModel: string;
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  constructor(private readonly config: OpenAIProviderConfig) {}

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const baseUrl = "https://api.openai.com/v1";
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 1,
        max_tokens: request.maxTokens ?? 1000,
        ...(request.jsonMode && { response_format: { type: "json_object" } }),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = text;
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        // not JSON
      }
      throw new AIProviderError(
        response.status,
        this.name,
        `OpenAI API error (${response.status}): ${errorMessage}`,
        new Error(text),
      );
    }

    const data = await response.json();

    return {
      id: data.id || `openai-${Date.now()}`,
      model: data.model || request.model,
      choices: data.choices?.map((c: any) => ({
        index: c.index,
        message: { role: "assistant", content: c.message?.content || "" },
        finishReason: c.finish_reason || null,
      })) || [],
      usage: data.usage,
    };
  }

  async *streamChat(request: AIChatRequest, signal?: AbortSignal): AsyncIterable<AIChatStreamChunk> {
    const baseUrl = "https://api.openai.com/v1";
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 1,
        max_tokens: request.maxTokens ?? 1000,
        stream: true,
        ...(request.jsonMode && { response_format: { type: "json_object" } }),
      }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = text;
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        // not JSON
      }
      throw new AIProviderError(
        response.status,
        this.name,
        `OpenAI API error (${response.status}): ${errorMessage}`,
        new Error(text),
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);

          if (line.endsWith("\r")) {
            // Remove trailing \r from Windows-style line endings
            continue;
          }

          if (!line.startsWith("data: ")) {
            continue;
          }

          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            return;
          }

          try {
            const data = JSON.parse(json);
            const delta = data.choices?.[0]?.delta?.content || "";
            const finishReason = data.choices?.[0]?.finish_reason || null;

            if (delta) {
              yield {
                delta,
                finishReason: null,
              };
            }
          } catch {
            // Not JSON, keep in buffer and continue
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield {
      delta: "",
      finishReason: "stop",
    };
  }
}
