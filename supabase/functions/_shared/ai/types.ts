export type AIMessageRole = "system" | "user" | "assistant";

export interface AITextPart {
  type: "text";
  text: string;
}

export interface AIImagePart {
  type: "image_url";
  image_url: { url: string };
}

export type AIMessagePart = AITextPart | AIImagePart;

export interface AIMessage {
  role: AIMessageRole;
  content: string | AIMessagePart[];
}

export interface AIChatRequest {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  stream?: boolean;
}

export interface AIChatChoice {
  index: number;
  message: { role: "assistant"; content: string };
  finishReason: string | null;
}

export interface AIChatResponse {
  id: string;
  model: string;
  choices: AIChatChoice[];
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export interface AIChatStreamChunk {
  delta: string;
  finishReason: string | null;
}

export class AIProviderError extends Error {
  constructor(
    public readonly status: number,
    public readonly provider: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
