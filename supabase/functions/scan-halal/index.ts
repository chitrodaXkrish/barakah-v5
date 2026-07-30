import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ScanRequest {
  barcode?: string;
  imageBase64?: string;
  imageMimeType?: string;
  session_id?: string;
  region?: string;
}

interface ProductLookup {
  source: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  region: string | null;
  ingredients_text: string | null;
  ingredients: string[];
}

const SYSTEM_PROMPT = `You are Barakah AI's halal product analyzer. Evaluate halal status using ONLY the verified product facts supplied by the barcode lookup and/or the uploaded image.

Return STRICT JSON only (no prose, no markdown fences) matching this schema:
{
  "product_name": string,
  "brand": string | null,
  "status": "halal" | "haram" | "mushbooh" | "unknown",
  "confidence": integer (0-100),
  "verdict": string,
  "category": string | null,
  "region": string | null,
  "ingredients": [ { "name": string, "ok": boolean, "note": string | null } ],
  "ingredients_hash": string | null
}

Rules:
- Do not identify a barcode from memory.
- If product facts are supplied, keep product_name and brand aligned with those facts.
- Never invent ingredients. If no ingredient list is supplied or readable, leave ingredients empty.
- If product facts and image are insufficient, set status="unknown" with confidence <= 20 and product_name "Unknown Product".`;

async function lookupBarcode(barcode?: string): Promise<ProductLookup | null> {
  const normalized = barcode?.replace(/\D/g, "");
  if (!normalized) return null;

  const fields = [
    "product_name",
    "product_name_en",
    "generic_name",
    "brands",
    "categories",
    "countries",
    "ingredients_text",
    "ingredients_text_en",
    "ingredients",
  ].join(",");

  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${normalized}.json?fields=${fields}`, {
    headers: {
      "User-Agent": "BarakahApp/1.0 halal-scanner",
    },
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (data?.status !== 1 || !data?.product) return null;

  const product = data.product;
  const ingredientNames = Array.isArray(product.ingredients)
    ? product.ingredients
        .map((ingredient: any) => ingredient?.text || ingredient?.id)
        .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
    : [];

  return {
    source: "openfoodfacts",
    product_name: product.product_name_en || product.product_name || product.generic_name || "Unknown Product",
    brand: product.brands || null,
    category: product.categories || null,
    region: product.countries || null,
    ingredients_text: product.ingredients_text_en || product.ingredients_text || null,
    ingredients: ingredientNames,
  };
}

const unknownBarcodeResult = (body: ScanRequest) => ({
  product_name: "Unknown Product",
  brand: null,
  status: "unknown",
  confidence: 10,
  verdict: body.barcode
    ? `Barcode ${body.barcode} was scanned, but no reliable product match was found.`
    : "No reliable product match was found.",
  category: null,
  region: body.region ?? null,
  ingredients: [],
  ingredients_hash: null,
  source: "barcode_lookup_miss",
});

async function callGemini(apiKey: string, body: ScanRequest, productFacts: ProductLookup | null) {
  const userParts: any[] = [];
  const parts: string[] = [];

  if (body.barcode) parts.push(`Barcode: ${body.barcode}`);
  if (body.region) parts.push(`User region hint: ${body.region}`);

  if (productFacts) {
    parts.push(
      [
        "Verified barcode lookup facts:",
        `Source: ${productFacts.source}`,
        `Product name: ${productFacts.product_name}`,
        `Brand: ${productFacts.brand ?? "Unknown"}`,
        `Category: ${productFacts.category ?? "Unknown"}`,
        `Region/Countries: ${productFacts.region ?? "Unknown"}`,
        `Ingredients text: ${productFacts.ingredients_text ?? "Not available"}`,
        `Parsed ingredients: ${productFacts.ingredients.join(", ") || "Not available"}`,
      ].join("\n"),
    );
  } else {
    parts.push("No verified barcode lookup facts were found.");
  }

  parts.push("Analyze this product for halal compliance and return the JSON.");
  userParts.push({ type: "text", text: parts.join("\n") });

  if (body.imageBase64) {
    const url = body.imageBase64.startsWith("data:")
      ? body.imageBase64
      : `data:${body.imageMimeType ?? "image/jpeg"};base64,${body.imageBase64}`;
    userParts.push({ type: "image_url", image_url: { url } });
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI gateway ${response.status}: ${text}`);
  }

  const data = await response.json();
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

    const productFacts = await lookupBarcode(body.barcode);
    const parsed =
      productFacts || body.imageBase64
        ? await callGemini(LOVABLE_API_KEY, body, productFacts)
        : unknownBarcodeResult(body);

    if (productFacts) {
      parsed.product_name = productFacts.product_name;
      parsed.brand = productFacts.brand;
      parsed.category = parsed.category ?? productFacts.category;
      parsed.region = parsed.region ?? productFacts.region ?? body.region ?? null;
      parsed.source = productFacts.source;
      parsed.lookup = productFacts;
    }

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const jwt = authHeader.slice(7);
        const payload = JSON.parse(atob(jwt.split(".")[1]));
        userId = payload.sub ?? null;
      } catch {
        // Ignore malformed auth headers.
      }
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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

    const { data, error } = await supabase.from("scan_history").insert(row).select().single();

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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
