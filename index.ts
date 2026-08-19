import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Put models that reliably support OpenAI-style function/tool calling
// first. (qwen-2.5-7b's tool-calling support via OpenRouter is less
// consistent than the others — kept last as a plain-text fallback.)
const MODEL_FALLBACKS = [
  "openai/gpt-5-nano",
  "deepseek/deepseek-v4-flash",
  "qwen/qwen-2.5-7b-instruct",
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

const SYSTEM_PROMPT = `You are Barakah AI, the Islamic assistant of the Barakah platform.

Your primary goal is to provide fast, clear, accurate, and context-rich answers about Islam based on the Qur'an, authentic Hadith (including Sahih al-Bukhari and Sahih Muslim), and established Islamic scholarship.

GUIDELINES:
1. DIRECT & QUICK RESPONSE: Always answer the user's prompt directly, clearly, and promptly without delay.
2. EVIDENCE & CITATIONS: Provide relevant Qur'an verses (Surah name/number and ayah) and authentic Hadith citations directly in your answer whenever applicable.
3. STRUCTURE: Provide a clear, well-structured response (Direct Answer -> Qur'an & Hadith Evidence -> Practical Context / Takeaway).
4. SCHOLARLY BALANCE: Respect recognized Islamic schools of jurisprudence. For complex personal or legal issues (fatwas, inheritance, divorce), recommend consulting a qualified scholar.
5. TONE: Warm, respectful, humble, encouraging, and Islamic in character.
6. LANGUAGE: Respond in the same language as the user (English, Urdu, Hindi, Hinglish, Arabic, Indonesian, etc.).`;

async function callOpenRouter(
  apiKey: string,
  messages: unknown[],
) {
  return await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      models: MODEL_FALLBACKS,
      messages,
      stream: true,
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { messages: incomingMessages } = await req.json();

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(Array.isArray(incomingMessages) ? incomingMessages : []),
    ];

    // Immediate streaming response for fast user feedback
    const finalResp = await callOpenRouter(OPENROUTER_API_KEY, messages);

    if (!finalResp.ok) {
      if (finalResp.status === 429) {
        return jsonResponse({ error: "Rate limit exceeded. Please try again later." }, 429);
      }
      if (finalResp.status === 402) {
        return jsonResponse({ error: "Service temporarily unavailable." }, 402);
      }
      const t = await finalResp.text();
      console.error("AI gateway error:", finalResp.status, t);
      return jsonResponse({ error: "AI service error" }, 500);
    }

    if (!finalResp.body) {
      return jsonResponse({ error: "AI service returned an empty stream." }, 500);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = finalResp.body!.getReader();
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
