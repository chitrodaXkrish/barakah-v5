import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ScanRequest {
  barcode?: string;
  imageBase64?: string; // data URL or raw base64
  imageMimeType?: string;
  session_id?: string;
  region?: string;
}

const SYSTEM_PROMPT = `You are Barakah AI's halal product analyzer. Given a product barcode number and/or a photo of a product, identify the product and evaluate its halal status based on ingredients and Islamic dietary rulings.

Return STRICT JSON only (no prose, no markdown fences) matching this schema:
{
  "product_name": string,
  "brand": string | null,
  "status": "halal" | "haram" | "mushbooh" | "unknown",
  "confidence": integer (0-100),
  "verdict": string,           // short human explanation
  "category": string | null,   // e.g. "biscuit", "beverage"
  "region": string | null,     // country/region of origin if known
  "ingredients": [ { "name": string, "ok": boolean, "note": string | null } ],
  "ingredients_hash": string | null // stable hash of ingredient list, or null
}

If the product cannot be identified, set status="unknown" with confidence <= 20 and product_name best-guess or "Unknown Product". Never invent ingredients — if unsure, leave the array empty.`;

async function callGemini(apiKey: string, body: ScanRequest) {
  const userParts: any[] = [];
  const parts: string[] = [];
  if (body.barcode) parts.push(`Barcode: ${body.barcode}`);
  if (body.region) parts.push(`User region hint: ${body.region}`);
  parts.push("Analyze this product for halal compliance and return the JSON.");
  userParts.push({ type: "text", text: parts.join("\n") });

  if (body.imageBase64) {
    const url = body.imageBase64.startsWith("data:")
      ? body.imageBase64
      : `data:${body.imageMimeType ?? "image/jpeg"};base64,${body.imageBase64}`;
    userParts.push({ type: "image_url", image_url: { url } });
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userParts },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as ScanRequest;
    if (!body.barcode && !body.imageBase64) {
      return new Response(JSON.stringify({ error: "Provide barcode and/or imageBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = await callGemini(LOVABLE_API_KEY, body);

    // Resolve user id from JWT if present
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const jwt = authHeader.slice(7);
        const payload = JSON.parse(atob(jwt.split(".")[1]));
        userId = payload.sub ?? null;
      } catch { /* ignore */ }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const row = {
      user_id: userId,
      barcode: body.barcode ?? null,
      product_name: parsed.product_name || "Unknown Product",
      brand: parsed.brand ?? null,
      status: parsed.status || "unknown",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
      verdict: parsed.verdict ?? null,
      category: parsed.category ?? null,
      region: parsed.region ?? body.region ?? null,
      ingredients_hash: parsed.ingredients_hash ?? null,
      ingredients: parsed.ingredients ?? null,
      raw_response: parsed,
      session_id: body.session_id ?? null,
    };

    const { data, error } = await supabase
      .from("scan_history")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error("scan_history insert error:", error);
      return new Response(JSON.stringify({ error: error.message, result: parsed }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ scan: data, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-halal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});