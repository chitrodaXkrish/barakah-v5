import type { AIChatRequest, AIChatResponse, AIChatStreamChunk } from "./types.ts";

export interface AIProvider {
  readonly name: string;
  chat(request: AIChatRequest): Promise<AIChatResponse>;
  streamChat(request: AIChatRequest, signal?: AbortSignal): AsyncIterable<AIChatStreamChunk>;
}

export interface MockProviderConfig {
  defaultContent?: string;
  scannerJsonResponse?: string;
  streamChunkSize?: number;
}

export interface OpenAIProviderConfig {
  apiKey: string;
  defaultModel: string;
}

export interface AIProviderFactoryOptions {
  openai?: OpenAIProviderConfig;
  mock?: MockProviderConfig;
}

export function createAIProvider(options: AIProviderFactoryOptions): AIProvider {
  if (options.openai) {
    return new (require("./openaiProvider.ts").OpenAIProvider)(options.openai);
  }
  return new (require("./mockProvider.ts").MockAIProvider)(options.mock || {});
}
