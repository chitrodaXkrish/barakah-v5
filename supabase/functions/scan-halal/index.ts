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

type HalalStatus = "halal" | "haram" | "mushbooh" | "unknown";

interface IngredientDecision {
  name: string;
  ok: boolean;
  note: string | null;
}

interface DeterministicResult {
  product_name: string;
  brand: string | null;
  status: HalalStatus;
  confidence: number;
  verdict: string;
  category: string | null;
  region: string | null;
  ingredients: IngredientDecision[];
  ingredients_hash: string | null;
  source: string;
  lookup: ProductLookup;
  deterministic: {
    status: HalalStatus;
    matched: Array<{ ingredient: string; rule: string; status: HalalStatus; note: string }>;
  };
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

const HARAM_RULES = [
  { pattern: /\bpork\b/i, label: "Pork", note: "Pork is prohibited." },
  { pattern: /\bporcine\b/i, label: "Porcine", note: "Porcine-derived ingredient is prohibited." },
  { pattern: /\bpig\b/i, label: "Pig", note: "Pig-derived ingredient is prohibited." },
  { pattern: /\bswine\b/i, label: "Swine", note: "Swine-derived ingredient is prohibited." },
  { pattern: /\bbacon\b/i, label: "Bacon", note: "Bacon is pork-derived." },
  { pattern: /\bham\b/i, label: "Ham", note: "Ham is pork-derived." },
  { pattern: /\blard\b/i, label: "Lard", note: "Lard is pork fat." },
  { pattern: /\balcohol\b/i, label: "Alcohol", note: "Alcohol is a prohibited/high-risk ingredient." },
  { pattern: /\bethanol\b/i, label: "Ethanol", note: "Ethanol indicates alcohol content." },
  { pattern: /\bwine\b/i, label: "Wine", note: "Wine is alcohol-based." },
  { pattern: /\brum\b/i, label: "Rum", note: "Rum is alcohol-based." },
  { pattern: /\bbeer\b/i, label: "Beer", note: "Beer is alcohol-based." },
  { pattern: /\bcarmine\b/i, label: "Carmine", note: "Carmine/E120 is insect-derived and often treated as non-halal." },
  { pattern: /\bcochineal\b/i, label: "Cochineal", note: "Cochineal/E120 is insect-derived and often treated as non-halal." },
  { pattern: /\be[\s-]*120\b/i, label: "E120", note: "E120 is carmine/cochineal." },
];

const MUSHBOOH_RULES = [
  { pattern: /\bgelatin(e)?\b/i, label: "Gelatin", note: "Gelatin source must be verified." },
  { pattern: /\be[\s-]*441\b/i, label: "E441", note: "E441 is gelatin and needs source verification." },
  { pattern: /\be[\s-]*471\b/i, label: "E471", note: "E471 may be animal-derived unless source is verified." },
  { pattern: /\be[\s-]*472[a-f]?\b/i, label: "E472", note: "E472 may be animal-derived unless source is verified." },
  { pattern: /\bshellac\b/i, label: "Shellac", note: "Shellac source/compliance needs verification." },
  { pattern: /\be[\s-]*904\b/i, label: "E904", note: "E904 is shellac and needs verification." },
  { pattern: /\bl[\s-]*cysteine\b/i, label: "L-Cysteine", note: "L-Cysteine source must be verified." },
  { pattern: /\be[\s-]*920\b/i, label: "E920", note: "E920/L-Cysteine source must be verified." },
  { pattern: /\banimal enzymes?\b/i, label: "Animal enzymes", note: "Animal enzyme source must be verified." },
  { pattern: /\brennet\b/i, label: "Rennet", note: "Rennet source must be verified." },
  { pattern: /\benzymes?\b/i, label: "Enzymes", note: "Enzyme source may need halal verification." },
  { pattern: /\bmono[-\s]?glycerides?\b/i, label: "Mono-glycerides", note: "Mono-glyceride source may need verification." },
  { pattern: /\bdiglycerides?\b/i, label: "Diglycerides", note: "Diglyceride source may need verification." },
  { pattern: /\bfatty acids?\b/i, label: "Fatty acids", note: "Fatty acid source may need verification." },
];

const splitIngredientsText = (text: string | null) =>
  (text ?? "")
    .split(/[,;()[\]\n.]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);

const getIngredientInputs = (productFacts: ProductLookup) => {
  const values = [...productFacts.ingredients, ...splitIngredientsText(productFacts.ingredients_text)];
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
};

const evaluateIngredient = (ingredient: string) => {
  for (const rule of HARAM_RULES) {
    if (rule.pattern.test(ingredient)) {
      return { status: "haram" as const, rule: rule.label, note: rule.note };
    }
  }

  for (const rule of MUSHBOOH_RULES) {
    if (rule.pattern.test(ingredient)) {
      return { status: "mushbooh" as const, rule: rule.label, note: rule.note };
    }
  }

  return { status: "halal" as const, rule: "No flagged ingredient", note: "No prohibited or doubtful match found." };
};

function runDeterministicHalalCheck(productFacts: ProductLookup, body: ScanRequest): DeterministicResult {
  const ingredients = getIngredientInputs(productFacts);

  if (ingredients.length === 0) {
    return {
      product_name: productFacts.product_name,
      brand: productFacts.brand,
      status: "unknown",
      confidence: 20,
      verdict: "OpenFoodFacts found this product, but no ingredient list was available for deterministic halal checking.",
      category: productFacts.category,
      region: productFacts.region ?? body.region ?? null,
      ingredients: [],
      ingredients_hash: null,
      source: "deterministic_rules",
      lookup: productFacts,
      deterministic: { status: "unknown", matched: [] },
    };
  }

  const decisions = ingredients.map((ingredient) => ({
    ingredient,
    decision: evaluateIngredient(ingredient),
  }));
  const matched = decisions
    .filter(({ decision }) => decision.status !== "halal")
    .map(({ ingredient, decision }) => ({
      ingredient,
      rule: decision.rule,
      status: decision.status,
      note: decision.note,
    }));
  const hasHaram = matched.some((match) => match.status === "haram");
  const hasMushbooh = matched.some((match) => match.status === "mushbooh");
  const status: HalalStatus = hasHaram ? "haram" : hasMushbooh ? "mushbooh" : "halal";
  const confidence = status === "halal" ? 82 : status === "haram" ? 96 : 78;
  const verdict =
    status === "halal"
      ? "No prohibited or doubtful ingredients were detected by Barakah's deterministic halal rules. Gemini verification was requested for an extra review."
      : status === "haram"
        ? `Haram ingredient detected: ${matched.find((match) => match.status === "haram")?.ingredient}.`
        : `Doubtful ingredient needs verification: ${matched[0]?.ingredient}.`;

  return {
    product_name: productFacts.product_name,
    brand: productFacts.brand,
    status,
    confidence,
    verdict,
    category: productFacts.category,
    region: productFacts.region ?? body.region ?? null,
    ingredients: decisions.map(({ ingredient, decision }) => ({
      name: ingredient,
      ok: decision.status === "halal",
      note: decision.status === "halal" ? null : decision.note,
    })),
    ingredients_hash: null,
    source: "deterministic_rules",
    lookup: productFacts,
    deterministic: { status, matched },
  };
}

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

const mergeGeminiWithDeterministic = (geminiResult: any, deterministicResult: DeterministicResult) => ({
  ...geminiResult,
  product_name: deterministicResult.product_name,
  brand: deterministicResult.brand,
  status: deterministicResult.status,
  confidence: deterministicResult.confidence,
  verdict: deterministicResult.verdict,
  category: geminiResult.category ?? deterministicResult.category,
  region: geminiResult.region ?? deterministicResult.region,
  ingredients:
    Array.isArray(geminiResult.ingredients) && geminiResult.ingredients.length > 0
      ? geminiResult.ingredients
      : deterministicResult.ingredients,
  source: "openfoodfacts_deterministic_gemini",
  lookup: deterministicResult.lookup,
  deterministic: deterministicResult.deterministic,
  deterministic_verdict: deterministicResult.verdict,
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ScanRequest;
    if (!body.barcode && !body.imageBase64) {
      return new Response(JSON.stringify({ error: "Provide barcode and/or imageBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productFacts = await lookupBarcode(body.barcode);
    let parsed: any;

    if (productFacts) {
      const deterministicResult = runDeterministicHalalCheck(productFacts, body);

      if (deterministicResult.status === "halal") {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          parsed = {
            ...deterministicResult,
            verdict: `${deterministicResult.verdict} Gemini verification could not run because LOVABLE_API_KEY is not configured.`,
          };
        } else {
          try {
            const geminiResult = await callGemini(LOVABLE_API_KEY, body, productFacts);
            parsed = mergeGeminiWithDeterministic(geminiResult, deterministicResult);
          } catch (error) {
            console.error("Gemini verification failed after deterministic halal result:", error);
            parsed = {
              ...deterministicResult,
              verdict: `${deterministicResult.verdict} Gemini verification failed, so this result is based on deterministic rules only.`,
            };
          }
        }
      } else {
        parsed = deterministicResult;
      }
    } else {
      if (body.barcode) {
        parsed = unknownBarcodeResult(body);
      } else {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          parsed = unknownBarcodeResult(body);
        } else {
          try {
            parsed = await callGemini(LOVABLE_API_KEY, body, null);
            parsed.source = "gemini_openfoodfacts_miss";
            parsed.verdict =
              parsed.verdict ??
              "OpenFoodFacts did not return a product match, so Gemini reviewed the available barcode/image context.";
          } catch (error) {
            console.error("Gemini fallback failed after OpenFoodFacts miss:", error);
            parsed = unknownBarcodeResult(body);
          }
        }
      }
    }

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
