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

const RULES_VERSION = "halal-rules-v1";
const AI_PROMPT_VERSION: string | null = null;

const normalizeBarcode = (raw: string | null | undefined): string | null => {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/\D/g, "");
  return cleaned.length > 0 ? cleaned : null;
};

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
      ? "No prohibited or doubtful ingredients were detected by Barakah's deterministic halal rules. GPT-5 nano verification was requested for an extra review."
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
  }
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


interface AIResult {
  product_name: string;
  brand: string | null;
  status: HalalStatus;
  confidence: number;
  verdict: string;
  category: string | null;
  region: string | null;
  ingredients: IngredientDecision[];
  ingredients_hash: string | null;
}

const AI_MODEL = "gpt-5-nano";

const AI_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    product_name: { type: "string" },
    brand: { type: ["string", "null"] },
    status: { type: "string", enum: ["halal", "haram", "mushbooh", "unknown"] },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    verdict: { type: "string" },
    category: { type: ["string", "null"] },
    region: { type: ["string", "null"] },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          ok: { type: "boolean" },
          note: { type: ["string", "null"] },
        },
        required: ["name", "ok", "note"],
      },
    },
    ingredients_hash: { type: ["string", "null"] },
  },
  required: [
    "product_name",
    "brand",
    "status",
    "confidence",
    "verdict",
    "category",
    "region",
    "ingredients",
    "ingredients_hash",
  ],
} as const;

function extractAiContent(data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => typeof part?.text === "string" ? part.text : "")
      .join("");
  }
  return "";
}

function isValidAiResult(value: any): value is AIResult {
  return Boolean(
    value &&
      typeof value.product_name === "string" &&
      (value.brand === null || typeof value.brand === "string") &&
      ["halal", "haram", "mushbooh", "unknown"].includes(value.status) &&
      Number.isInteger(value.confidence) &&
      value.confidence >= 0 &&
      value.confidence <= 100 &&
      typeof value.verdict === "string" &&
      (value.category === null || typeof value.category === "string") &&
      (value.region === null || typeof value.region === "string") &&
      Array.isArray(value.ingredients) &&
      value.ingredients.every(
        (item: any) =>
          item &&
          typeof item.name === "string" &&
          typeof item.ok === "boolean" &&
          (item.note === null || typeof item.note === "string"),
      ) &&
      (value.ingredients_hash === null || typeof value.ingredients_hash === "string"),
  );
}

async function callOpenAI(
  body: ScanRequest,
  productFacts: ProductLookup | null,
): Promise<AIResult> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

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

  parts.push(
    "Analyze this product for halal compliance and return the requested structured result.",
  );

  const userContent: any[] = [
    { type: "text", text: parts.join("\n") },
  ];

  if (body.imageBase64) {
    const imageUrl = body.imageBase64.startsWith("data:")
      ? body.imageBase64
      : `data:${body.imageMimeType ?? "image/jpeg"};base64,${body.imageBase64}`;

    userContent.push({
      type: "image_url",
      image_url: { url: imageUrl },
    });
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        models: [
          "openai/gpt-5-nano",
          "deepseek/deepseek-v4-flash",
        ],
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        stream: false,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "halal_product_analysis",
            strict: true,
            schema: AI_RESPONSE_SCHEMA,
          },
        },
        max_tokens: 1200,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter API ${response.status}: ${errorText}`,
    );
  }

  const data = await response.json();
  const content = extractAiContent(data);

  if (!content) {
    throw new Error("OpenRouter returned an empty structured response");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `OpenRouter response JSON parse error: ${
        error instanceof Error ? error.message : "parse error"
      }`,
    );
  }

  if (!isValidAiResult(parsed)) {
    throw new Error(
      "OpenRouter returned a response that does not match the halal analysis schema",
    );
  }

  return parsed;
}

const mergeAiWithDeterministic = (aiResult: AIResult, deterministicResult: DeterministicResult) => ({
  ...aiResult,
  product_name: deterministicResult.product_name,
  brand: deterministicResult.brand,
  status: deterministicResult.status,
  confidence: deterministicResult.confidence,
  verdict: deterministicResult.verdict,
  category: aiResult.category ?? deterministicResult.category,
  region: aiResult.region ?? deterministicResult.region,
  ingredients:
    aiResult.ingredients.length > 0
      ? aiResult.ingredients
      : deterministicResult.ingredients,
  source: "openfoodfacts_deterministic_openai_gpt5nano",
  lookup: deterministicResult.lookup,
  deterministic: deterministicResult.deterministic,
  deterministic_verdict: deterministicResult.verdict,
});

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getIngredientsHash(parsed: any): Promise<string | null> {
  const ingredients = Array.isArray(parsed?.ingredients)
    ? parsed.ingredients
        .map((item: any) => typeof item?.name === "string" ? item.name.trim().toLowerCase() : "")
        .filter(Boolean)
    : [];

  if (ingredients.length === 0) return null;

  const canonical = Array.from(new Set(ingredients)).sort().join("|");
  return sha256Hex(canonical);
}

function getAiModelFromSource(source: unknown): string | null {
  return typeof source === "string" && source.includes("gpt5nano") ? AI_MODEL : null;
}

async function writeProductCache(
  supabase: ReturnType<typeof createClient>,
  normalizedBarcode: string | null,
  parsed: any,
): Promise<any | null> {
  if (!normalizedBarcode) return null;

  const status = parsed?.status;
  const source = parsed?.source;

  // Decision #11: never cache unknown or barcode lookup misses.
  if (status === "unknown" || source === "barcode_lookup_miss") {
    return null;
  }

  const ingredientsHash = await getIngredientsHash(parsed);
  parsed.ingredients_hash = ingredientsHash;
  const cacheRow = {
    normalized_barcode: normalizedBarcode,
    product_name: parsed?.product_name || "Unknown Product",
    brand: parsed?.brand ?? null,
    status,
    confidence: typeof parsed?.confidence === "number" ? parsed.confidence : null,
    verdict: parsed?.verdict ?? null,
    ingredients: Array.isArray(parsed?.ingredients) ? parsed.ingredients : [],
    ingredients_hash: ingredientsHash,
    source: typeof source === "string" ? source : "scan_halal",
    rules_version: RULES_VERSION,
    ai_model: getAiModelFromSource(source),
    ai_prompt_version: AI_PROMPT_VERSION,
  };

  try {
    const { data, error } = await supabase
      .from("product_halal_cache")
      .upsert(cacheRow, { onConflict: "normalized_barcode" })
      .select()
      .single();

    if (error) {
      console.error("product_halal_cache upsert error:", error);
      return null;
    }

    return data;
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ScanRequest;

    // Cache-hit / cache-miss logic reconstruction
    // Cache-first lookup: a hit short-circuits all upstream work.
    const normalizedBarcode = normalizeBarcode(body.barcode);

    if (normalizedBarcode) {
      try {
        const { data: cached, error: cacheReadError } = await supabase
          .from("product_halal_cache")
          .select("*")
          .eq("normalized_barcode", normalizedBarcode)
          .maybeSingle();

        if (cacheReadError) {
          console.error("product_halal_cache read error:", cacheReadError);
        } else if (cached) {
          const cachedResult = {
            product_name: cached.product_name,
            brand: cached.brand ?? null,
            status: cached.status,
            confidence: cached.confidence ?? null,
            verdict: cached.verdict ?? null,
            category: cached.category ?? null,
            region: cached.region ?? body.region ?? null,
            ingredients: Array.isArray(cached.ingredients) ? cached.ingredients : [],
            ingredients_hash: cached.ingredients_hash ?? null,
            source: cached.source ?? "product_halal_cache",
            lookup: null,
            deterministic: { status: cached.status, matched: [] },
          };

          const { data: cachedScan, error: cachedScanError } = await supabase
            .from("scan_history")
            .insert(buildScanHistoryRow(cachedResult, cached.id))
            .select()
            .single();

          if (cachedScanError) {
            console.error("scan_history insert error (cache hit):", cachedScanError);
            return new Response(
              JSON.stringify({ result: cachedResult }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Success path: return the cached scan along with the cached result
          return new Response(
            JSON.stringify({ scan: cachedScan, result: cachedResult }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.error("cache-hit error:", e);
      }
    }

    // CACHE MISS PATH
    const productFacts = await lookupBarcode(body.barcode);
    let parsed: any;

    if (productFacts) {
      const deterministicResult = runDeterministicHalalCheck(productFacts, body);

      if (deterministicResult.status === "halal") {
        try {
          const aiResult = await callOpenAI(body, productFacts);
          parsed = mergeAiWithDeterministic(aiResult, deterministicResult);
        } catch (error) {
          console.error(
            "GPT-5 nano verification failed after deterministic halal result:",
            error,
          );

          parsed = {
            ...deterministicResult,
            verdict: `${deterministicResult.verdict} GPT-5 nano verification failed, so this result is based on deterministic rules only.`,
            source: "openfoodfacts_deterministic_rules",
          };
        }
      } else {
        parsed = deterministicResult;
      }
    } else {
      if (body.imageBase64) {
        try {
          parsed = await callOpenAI(body, null);
          parsed.source = "openai_gpt5nano_image";
        } catch (error) {
          console.error(
            "GPT-5 nano image analysis failed after OpenFoodFacts miss:",
            error,
          );
          parsed = unknownBarcodeResult(body);
        }
      } else {
        parsed = unknownBarcodeResult(body);
      }
    }

    // Cache write is best-effort. It never blocks a scan response.
    const cachedProduct = await writeProductCache(supabase, normalizedBarcode, parsed);
    const productCacheId = cachedProduct?.id ?? null;

    const row = buildScanHistoryRow(parsed, productCacheId);
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
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
    }
    // If no barcode provided, fall back to unknown response as a safety net
    return new Response(JSON.stringify({ scan: null, result: unknownBarcodeResult(body) }), {
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
        if (productFacts) {
          parsed = runDeterministicHalalCheck(productFacts, body);
          if (parsed.status === "halal") {
            try {
              const aiResult = await callOpenAI(body, productFacts);
              if (isValidAiResult(aiResult)) {
                parsed = mergeAiWithDeterministic(aiResult, parsed);
              }
            } catch {
              // AI enrichment failed; keep deterministic result
            }
          }
        } else if (body.imageBase64) {
          try {
            const aiResult = await callOpenAI(body, null);
            if (isValidAiResult(aiResult)) {
              (aiResult as any).source = "openai_gpt5nano_image";
              parsed = aiResult;
            } else {
              parsed = unknownBarcodeResult(body);
            }
          } catch {
            parsed = unknownBarcodeResult(body);
          }
        } else {
          parsed = unknownBarcodeResult(body);
        }

        // Cache write is best-effort. It never blocks a scan response.
        const cachedProduct = await writeProductCache(supabase, normalizedBarcode, parsed);
        const productCacheId = cachedProduct?.id ?? null;

        const row = buildScanHistoryRow(parsed, productCacheId);
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
        return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // If no barcode provided, fall back to unknown response as a safety net
    return new Response(JSON.stringify({ scan: null, result: unknownBarcodeResult(body) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
          return new Response(
  }
  
  // end of normalizedBarcode block
});
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } 
  } catch (e) {
    console.error("scan-halal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});