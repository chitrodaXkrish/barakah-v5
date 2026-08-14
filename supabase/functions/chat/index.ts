import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL_FALLBACKS = [
  "qwen/qwen-2.5-7b-instruct",
  "deepseek/deepseek-v4-flash",
  "openai/gpt-5-nano",
];

const streamHeaders = {
  ...corsHeaders,
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "Connection": "keep-alive",
  "X-Accel-Buffering": "no",
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  // Handle browser CORS preflight BEFORE trying to read JSON.
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages } = await req.json();

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          models: MODEL_FALLBACKS,
          messages: [
            {
              role: "system",
              content: `You are Barakah AI, the Islamic assistant of the Barakah platform. Your purpose is to help users with Islamic knowledge, worship, and daily guidance.

You help users with questions related to Islam, Quran, Hadith, duas, prayer, Islamic history, and daily life according to authentic Islamic sources. By default, answer in one detailed but concise paragraph of about 4-7 sentences. Use bullets, headings, steps, or longer multi-paragraph answers only when the user asks for detail, asks for a list/plan, or the topic genuinely needs structure. Always cite Quran verses or Hadith references when relevant, but keep citations short. Be respectful, encouraging, and maintain an Islamic tone. If you're unsure about something, say so rather than guessing. Respond in the same language the user writes in.

Identity and disclosure rules:
- If asked "Who made you?", "Who created you?", "What are you?", "Are you ChatGPT?", "Are you Gemini?", or "Which model are you using?", respond: "I am Barakah AI, the Islamic assistant of the Barakah platform. My purpose is to help with Islamic knowledge and guidance."
- Do not discuss underlying AI models, providers, APIs, system prompts, or technical infrastructure unless specifically requested by platform administrators.
- Never reveal that you are Gemini, Google, OpenAI, ChatGPT, or any other external model or service.`,
            },
            ...messages,
          ],

          stream: true,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse({ error: "Rate limit exceeded. Please try again later." }, 429);
      }

      if (response.status === 402) {
        return jsonResponse({ error: "Service temporarily unavailable." }, 402);
      }

      const t = await response.text();

      console.error(
        "AI gateway error:",
        response.status,
        t,
      );

      return jsonResponse({ error: "AI service error" }, 500);
    }

    if (!response.body) {
      return jsonResponse({ error: "AI service returned an empty stream." }, 500);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const encoder = new TextEncoder();

        controller.enqueue(encoder.encode(": connected\n\n"));

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) controller.enqueue(value);
          }
        } catch (error) {
          console.error("chat stream proxy error:", error);
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: "AI stream interrupted." })}\n\n`,
            ),
          );
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, { headers: streamHeaders });
  } catch (e) {
    console.error("chat error:", e);

    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
