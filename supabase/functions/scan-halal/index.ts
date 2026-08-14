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
const BARCODE_LOOKUP_TIMEOUT_MS = 4500;
const AI_TIMEOUT_MS = 30000;

const normalizeBarcode = (raw: string | null | undefined): string | null => {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/\D/g, "");
  return cleaned.length > 0 ? cleaned : null;
};

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
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

const BARCODE_HINTS: Record<string, ProductLookup> = {
  "8909081012709": {
    source: "barcode_hint",
    product_name: "Candyman Choco Double Eclairs Birthday Pack",
    brand: "Candyman",
    category: "Chocolate eclairs candy",
    region: "India",
    ingredients_text: null,
    ingredients: [],
  },
};

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
- Prefer verified barcode lookup facts and uploaded label text/images over model knowledge.
- If a barcode lookup fails but a barcode was supplied, you may cautiously use general product knowledge to identify a highly recognizable product. Keep confidence low unless the product is very clear.
- If product facts are supplied, keep product_name and brand aligned with those facts.
- Never invent ingredients. If no ingredient list is supplied or readable, leave ingredients empty.
- If product facts identify a common packaged food but ingredients are unavailable, make a cautious metadata-based assessment with low confidence instead of automatically returning unknown.
- If no reliable product facts, recognizable barcode knowledge, or readable image are available, set status="unknown" with confidence <= 20 and product_name "Unknown Product".`;

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
      ? "No prohibited or doubtful ingredients were detected by Barakah's deterministic halal rules."
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

function runMetadataHalalHeuristic(productFacts: ProductLookup, body: ScanRequest, aiResult?: AIResult | null) {
  const metadata = [
    productFacts.product_name,
    productFacts.brand,
    productFacts.category,
    productFacts.region,
  ]
    .filter(Boolean)
    .join(" ");

  const parts = splitIngredientsText(metadata);
  const decisions = parts.map((part) => ({
    part,
    decision: evaluateIngredient(part),
  }));

  const matched = decisions
    .filter(({ decision }) => decision.status !== "halal")
    .map(({ part, decision }) => ({
      ingredient: part,
      rule: decision.rule,
      status: decision.status,
      note: decision.note,
    }));

  const hasHaram = matched.some((match) => match.status === "haram");
  const hasMushbooh = matched.some((match) => match.status === "mushbooh");
  const status: HalalStatus = hasHaram ? "haram" : hasMushbooh ? "mushbooh" : "halal";
  const confidence = status === "halal" ? 58 : status === "haram" ? 82 : 62;
  const metadataNote =
    "Ingredient list was unavailable, so this is a cautious product-name/category assessment. Scan the ingredient label for stronger verification.";

  return {
    product_name: productFacts.product_name,
    brand: productFacts.brand,
    status,
    confidence,
    verdict:
      status === "halal"
        ? `No prohibited or doubtful terms were detected in the available product metadata. ${metadataNote}`
        : status === "haram"
          ? `Prohibited term detected in product metadata: ${matched.find((match) => match.status === "haram")?.ingredient}. ${metadataNote}`
          : `Doubtful term detected in product metadata: ${matched[0]?.ingredient}. ${metadataNote}`,
    category: aiResult?.category ?? productFacts.category,
    region: aiResult?.region ?? productFacts.region ?? body.region ?? null,
    ingredients: [
      {
        name: `Product metadata: ${[productFacts.product_name, productFacts.category].filter(Boolean).join(" - ")}`,
        ok: status === "halal",
        note: status === "halal" ? metadataNote : matched[0]?.note ?? metadataNote,
      },
    ],
    ingredients_hash: null,
    source: aiResult ? `${productFacts.source}_ai_metadata_heuristic` : `${productFacts.source}_metadata_heuristic`,
    lookup: productFacts,
    deterministic: { status, matched },
    ai_verdict: aiResult?.verdict ?? null,
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

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://world.openfoodfacts.org/api/v2/product/${normalized}.json?fields=${fields}`,
      {
        headers: {
          "User-Agent": "BarakahApp/1.0 halal-scanner",
        },
      },
      BARCODE_LOOKUP_TIMEOUT_MS,
    );
  } catch (error) {
    console.error("OpenFoodFacts lookup failed:", error);
    return null;
  }

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

function lookupBarcodeHint(barcode?: string): ProductLookup | null {
  const normalized = normalizeBarcode(barcode);
  return normalized ? BARCODE_HINTS[normalized] ?? null : null;
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

const AI_MODEL_FALLBACKS = [
  "openai/gpt-5-nano",
  "deepseek/deepseek-v4-flash",
];
const AI_MODEL = AI_MODEL_FALLBACKS[0];

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
  timeoutMs = AI_TIMEOUT_MS,
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
    parts.push(
      body.barcode
        ? "No verified barcode lookup facts were found. Try a cautious barcode-only assessment using general product knowledge; return unknown if you cannot recognize the product reliably."
        : "No verified barcode lookup facts were found.",
    );
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

  const response = await fetchWithTimeout(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        models: AI_MODEL_FALLBACKS,
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
    timeoutMs,
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

const mergeAiWithDeterministic = (aiResult: AIResult, deterministicResult: DeterministicResult) => {
  const deterministicMatched = deterministicResult.deterministic.matched;
  const deterministicHasFlag = deterministicResult.status === "haram" || deterministicResult.status === "mushbooh";
  const aiHasUsableDecision = aiResult.status !== "unknown";

  const status = deterministicHasFlag
    ? deterministicResult.status
    : aiHasUsableDecision
      ? aiResult.status
      : deterministicResult.status;

  const confidence = deterministicHasFlag
    ? Math.max(deterministicResult.confidence, aiResult.confidence)
    : aiHasUsableDecision
      ? aiResult.confidence
      : deterministicResult.confidence;

  const verdict = deterministicHasFlag
    ? `${deterministicResult.verdict} AI verification was also requested, but deterministic safety rules keep this classification conservative.`
    : aiHasUsableDecision
      ? aiResult.verdict
      : `${deterministicResult.verdict} AI verification did not add enough extra evidence.`;

  return {
    ...aiResult,
    product_name: deterministicResult.product_name,
    brand: deterministicResult.brand,
    status,
    confidence,
    verdict,
    category: aiResult.category ?? deterministicResult.category,
    region: aiResult.region ?? deterministicResult.region,
    ingredients:
      aiResult.ingredients.length > 0
        ? aiResult.ingredients
        : deterministicResult.ingredients,
    source: "openfoodfacts_deterministic_openrouter_ai",
    lookup: deterministicResult.lookup,
    deterministic: { ...deterministicResult.deterministic, matched: deterministicMatched },
    deterministic_verdict: deterministicResult.verdict,
    ai_verdict: aiResult.verdict,
  };
};

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
  return typeof source === "string" && source.includes("openrouter_ai") ? AI_MODEL : null;
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
  } catch (e) {
    console.error("product_halal_cache write error:", e);
    return null;
  }
}

function buildScanHistoryRow(
  parsed: any,
  productCacheId: string | null,
  userId: string | null,
  normalizedBarcode: string | null,
) {
  return {
    user_id: userId,
    barcode: normalizedBarcode,
    product_name: parsed?.product_name || "Unknown Product",
    brand: parsed?.brand ?? null,
    status: parsed?.status || "unknown",
    confidence: typeof parsed?.confidence === "number" ? parsed.confidence : null,
    verdict: parsed?.verdict ?? null,
    category: parsed?.category ?? null,
    region: parsed?.region ?? null,
    ingredients_hash: parsed?.ingredients_hash ?? null,
    product_cache_id: productCacheId,
  };
}

function buildResultFromScanHistory(scan: any, body: ScanRequest) {
  const linkedCache = scan?.product_halal_cache;
  return {
    product_name: scan?.product_name || "Unknown Product",
    brand: scan?.brand ?? null,
    status: scan?.status || "unknown",
    confidence: typeof scan?.confidence === "number" ? scan.confidence : null,
    verdict: scan?.verdict ?? null,
    category: scan?.category ?? null,
    region: scan?.region ?? body.region ?? null,
    ingredients: Array.isArray(linkedCache?.ingredients) ? linkedCache.ingredients : [],
    ingredients_hash: scan?.ingredients_hash ?? linkedCache?.ingredients_hash ?? null,
    source: "scan_history",
    lookup: null,
    deterministic: { status: scan?.status || "unknown", matched: [] },
  };
}

async function getRequestUserId(
  supabase: ReturnType<typeof createClient>,
  req: Request,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    console.error("scan-halal auth user lookup error:", error);
    return null;
  }

  return data.user?.id ?? null;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Supabase service credentials are not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const userId = await getRequestUserId(supabase, req);
    const body = (await req.json()) as ScanRequest;
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
        } else if (cached?.status && cached.status !== "unknown") {
          const cachedResult = {
            product_name: cached.product_name,
            brand: cached.brand ?? null,
            status: cached.status,
            confidence: cached.confidence ?? null,
            verdict: cached.verdict ?? null,
            category: null,
            region: body.region ?? null,
            ingredients: Array.isArray(cached.ingredients) ? cached.ingredients : [],
            ingredients_hash: cached.ingredients_hash ?? null,
            source: cached.source ?? "product_halal_cache",
            lookup: null,
            deterministic: { status: cached.status, matched: [] },
          };

          const { data: cachedScan, error: cachedScanError } = await supabase
            .from("scan_history")
            .insert(buildScanHistoryRow(cachedResult, cached.id, userId, normalizedBarcode))
            .select()
            .single();

          if (cachedScanError) {
            console.error("scan_history insert error (cache hit):", cachedScanError);
            return jsonResponse({ result: cachedResult });
          }

          return jsonResponse({ scan: cachedScan, result: cachedResult });
        }

        const { data: historicalScan, error: historicalScanError } = await supabase
          .from("scan_history")
          .select(`
            id,
            product_name,
            brand,
            status,
            confidence,
            verdict,
            category,
            region,
            ingredients_hash,
            product_cache_id,
            created_at,
            product_halal_cache:product_cache_id (
              ingredients,
              ingredients_hash
            )
          `)
          .eq("barcode", normalizedBarcode)
          .neq("status", "unknown")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (historicalScanError) {
          console.error("scan_history barcode lookup error:", historicalScanError);
        } else if (historicalScan) {
          const historicalResult = buildResultFromScanHistory(historicalScan, body);
          const { data: repeatedScan, error: repeatedScanError } = await supabase
            .from("scan_history")
            .insert(buildScanHistoryRow(
              historicalResult,
              historicalScan.product_cache_id ?? null,
              userId,
              normalizedBarcode,
            ))
            .select()
            .single();

          if (repeatedScanError) {
            console.error("scan_history insert error (history hit):", repeatedScanError);
            return jsonResponse({ result: historicalResult });
          }

          return jsonResponse({ scan: repeatedScan, result: historicalResult });
        }
      } catch (e) {
        console.error("cache-hit error:", e);
      }
    }

    const productFacts = await lookupBarcode(body.barcode);
    const barcodeHint = productFacts ? null : lookupBarcodeHint(body.barcode);
    const lookupFacts = productFacts ?? barcodeHint;
    let parsed: any;

    if (lookupFacts) {
      const deterministicResult = runDeterministicHalalCheck(lookupFacts, body);

      try {
        const aiResult = await callOpenAI(body, lookupFacts);
        parsed = deterministicResult.status === "unknown"
          ? aiResult.status === "unknown"
            ? runMetadataHalalHeuristic(lookupFacts, body, aiResult)
            : {
                ...aiResult,
                product_name: lookupFacts.product_name,
                brand: lookupFacts.brand,
                category: aiResult.category ?? lookupFacts.category,
                region: aiResult.region ?? lookupFacts.region ?? body.region ?? null,
                source: `${lookupFacts.source}_unknown_openrouter_ai`,
                lookup: lookupFacts,
                deterministic: deterministicResult.deterministic,
                deterministic_verdict: deterministicResult.verdict,
              }
          : mergeAiWithDeterministic(aiResult, deterministicResult);
      } catch (error) {
        console.error("AI verification failed after OpenFoodFacts result:", error);
        parsed = deterministicResult.status === "unknown"
          ? runMetadataHalalHeuristic(lookupFacts, body)
          : {
              ...deterministicResult,
              verdict: `${deterministicResult.verdict} AI verification failed, so this result is based on deterministic rules only.`,
              source: "openfoodfacts_deterministic_rules",
            };
      }
    } else {
      if (!body.imageBase64) {
        try {
          parsed = await callOpenAI(body, null);
          parsed.source = "openrouter_ai_barcode_lookup_miss";
        } catch (error) {
          console.error("AI fallback failed after barcode lookup miss:", error);
          parsed = unknownBarcodeResult(body);
        }
      } else {
        try {
          parsed = await callOpenAI(body, null);
          parsed.source = "openrouter_ai_image";
        } catch (error) {
          console.error("AI fallback failed after OpenFoodFacts miss:", error);
          parsed = unknownBarcodeResult(body);
        }
      }
    }

    const cachedProduct = await writeProductCache(supabase, normalizedBarcode, parsed);
    const productCacheId = cachedProduct?.id ?? null;

    const { data, error } = await supabase
      .from("scan_history")
      .insert(buildScanHistoryRow(parsed, productCacheId, userId, normalizedBarcode))
      .select()
      .single();

    if (error) {
      console.error("scan_history insert error:", error);
      return jsonResponse({ error: error.message, result: parsed }, 500);
    }

    return jsonResponse({ scan: data, result: parsed });
  } catch (e) {
    console.error("scan-halal error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
