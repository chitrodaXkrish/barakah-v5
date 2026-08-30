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
const BARCODE_LOOKUP_TIMEOUT_MS = 0;
const AI_TIMEOUT_MS = 0;
const AI_TIMEOUT_MS_WITH_SEARCH = 0;

const normalizeBarcode = (raw: string | null | undefined): string | null => {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/\D/g, "");
  return cleaned.length > 0 ? cleaned : null;
};

const getBarcodeCandidates = (raw: string | null | undefined): string[] => {
  const normalized = normalizeBarcode(raw);
  if (!normalized) return [];

  const candidates = [normalized];
  if (normalized.length === 12) candidates.push(`0${normalized}`);
  if (normalized.length === 13 && normalized.startsWith("0")) candidates.push(normalized.slice(1));

  return Array.from(new Set(candidates));
};

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  if (timeoutMs <= 0) {
    return await fetch(input, init);
  }

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

const SYSTEM_PROMPT = `You are Barakah AI's halal product analyzer. Evaluate halal status using ONLY the verified product facts supplied by the barcode lookup and/or the uploaded image, or real information you retrieve with the web_search tool.

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
- Never identify a product from a barcode number alone using your own training knowledge. If no verified product facts or readable label/image facts are supplied, return product_name "Unknown Product", status "unknown", confidence <= 20 - UNLESS you use the web_search tool to find real, current information about that barcode or product, in which case follow the WEB SEARCH rules below instead.
- If product facts are supplied, keep product_name and brand aligned with those facts.
- Never invent ingredients. If no ingredient list is supplied or readable, leave ingredients empty.
- If product facts identify a common packaged food but ingredients are unavailable, make a cautious metadata-based assessment with low confidence instead of automatically returning unknown.
- If no reliable product facts or readable image are available, set status="unknown" with confidence <= 20 and product_name "Unknown Product".

WEB SEARCH:
- You have a web_search tool. Only use it when verified barcode lookup facts were not supplied.
- If a barcode number was supplied but not found in the verified lookup, you may call web_search using the barcode number itself as the query, to check whether any retailer or barcode-database page has indexed this exact product.
- If an image was supplied, first try to read the ingredients panel directly from the image. That is the strongest possible evidence, since it is the user's actual physical product. Only call web_search using the brand/product name visible in the photo if the ingredients panel itself is not visible or not legible in the image.
- Do not use web_search merely to confirm a guess you already made from general knowledge. Ground your answer in what the search actually returns.
- Anything reported from web_search rather than read directly from the user's own photo is not confirmed against the specific product in front of the user. Packaging and recipes vary by region and change over time. Cap confidence at 50 or below for any status/ingredients derived from web_search, and say explicitly in the verdict that this is based on published product information, not confirmed from the user's own photo.`;

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
  const candidates = getBarcodeCandidates(barcode);
  if (candidates.length === 0) return null;

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

  for (const candidate of candidates) {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        `https://world.openfoodfacts.org/api/v2/product/${candidate}.json?fields=${fields}`,
        {
          headers: {
            "User-Agent": "BarakahApp/1.0 halal-scanner",
          },
        },
        BARCODE_LOOKUP_TIMEOUT_MS,
      );
    } catch (error) {
      console.error(`OpenFoodFacts lookup failed for ${candidate}:`, error);
      continue;
    }

    if (!response.ok) continue;

    const data = await response.json();
    if (data?.status !== 1 || !data?.product) continue;

    const product = data.product;
    const ingredientNames = Array.isArray(product.ingredients)
      ? product.ingredients
          .map((ingredient: any) => ingredient?.text || ingredient?.id)
          .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
      : [];

    return {
      source: candidate === candidates[0] ? "openfoodfacts" : "openfoodfacts_barcode_alias",
      product_name: product.product_name_en || product.product_name || product.generic_name || "Unknown Product",
      brand: product.brands || null,
      category: product.categories || null,
      region: product.countries || null,
      ingredients_text: product.ingredients_text_en || product.ingredients_text || null,
      ingredients: ingredientNames,
    };
  }

  return null;
}

function lookupBarcodeHint(barcode?: string): ProductLookup | null {
  for (const candidate of getBarcodeCandidates(barcode)) {
    const hint = BARCODE_HINTS[candidate];
    if (hint) return hint;
  }
  return null;
}

function cleanSearchText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/\|.*$/, "")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseMarkdownSearchResults(markdown: string, normalized: string) {
  const linkMatches = Array.from(markdown.matchAll(/\[([^\]]{4,160})\]\((https?:\/\/[^)\s]+)\)/g));
  const candidates = linkMatches
    .map((match) => {
      const contextStart = Math.max(0, (match.index ?? 0) - 500);
      const contextEnd = Math.min(markdown.length, (match.index ?? 0) + match[0].length + 500);
      const context = decodeHtmlEntities(markdown.slice(contextStart, contextEnd));

      return {
        title: cleanSearchText(decodeHtmlEntities(match[1])),
        link: decodeHtmlEntities(match[2]),
        context,
      };
    })
    .filter((item) =>
      item.title &&
      item.context.includes(normalized) &&
      !/google|sign in|cached|translate|privacy|terms/i.test(item.title) &&
      !/google\./i.test(item.link)
    );

  return candidates[0] ?? null;
}

async function lookupProductSearch(barcode?: string): Promise<ProductLookup | null> {
  const normalized = normalizeBarcode(barcode);
  const apiKey = Deno.env.get("SCRAPEDO_API_KEY");

  if (!normalized || !apiKey) return null;

  const targetUrl = new URL("https://www.google.com/search");
  targetUrl.searchParams.set("q", `${normalized} product barcode`);
  targetUrl.searchParams.set("num", "5");

  const url = new URL("https://api.scrape.do/");
  url.searchParams.set("token", apiKey);
  url.searchParams.set("url", targetUrl.toString());
  url.searchParams.set("output", "markdown");
  url.searchParams.set("geoCode", "in");

  let response: Response;
  try {
    response = await fetchWithTimeout(url.toString(), { method: "GET" }, BARCODE_LOOKUP_TIMEOUT_MS);
  } catch (error) {
    console.error(`Product search lookup failed for ${normalized}:`, error);
    return null;
  }

  if (!response.ok) {
    console.error(`Product search lookup returned ${response.status} for ${normalized}:`, await response.text());
    return null;
  }

  const markdown = await response.text();
  const result = parseMarkdownSearchResults(markdown, normalized);

  if (!result) return null;

  const productName = result.title;

  if (!productName) return null;

  return {
    source: "scrapedo_product_search",
    product_name: productName,
    brand: null,
    category: `Search result: ${result.link}`,
    region: null,
    ingredients_text: null,
    ingredients: [],
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
  ai_model?: string;
  web_search_used?: boolean;
  sources?: WebCitation[];
}

interface WebCitation {
  url: string;
  title: string | null;
}

const AI_MODEL_FALLBACKS = [
  "openai/gpt-5-nano",
  "deepseek/deepseek-v4-flash",
];
const AI_WEB_SEARCH_MODEL_FALLBACKS = [
  ...AI_MODEL_FALLBACKS,
  "google/gemini-2.5-flash-lite",
];
const AI_MODEL = AI_MODEL_FALLBACKS[0];

const WEB_SEARCH_TOOL = {
  type: "openrouter:web_search",
  parameters: {
    engine: "auto",
    max_results: 5,
    max_total_results: 10,
    max_uses: 3,
    search_context_size: "medium",
  },
};

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

function extractWebCitations(data: any): WebCitation[] {
  const annotations = data?.choices?.[0]?.message?.annotations;
  if (!Array.isArray(annotations)) return [];

  return annotations
    .filter((annotation: any) =>
      annotation?.type === "url_citation" &&
      typeof annotation?.url_citation?.url === "string"
    )
    .map((annotation: any) => ({
      url: annotation.url_citation.url as string,
      title: typeof annotation.url_citation.title === "string"
        ? annotation.url_citation.title
        : null,
    }));
}

function extractJsonObject(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const fencedJson = extractJsonObject(fenced[1]);
    if (fencedJson) return fencedJson;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return null;
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

async function repairAiResultJson(
  rawContent: string,
  body: ScanRequest,
  originalModel: string,
  apiKey: string,
): Promise<AIResult> {
  const barcodeCandidates = getBarcodeCandidates(body.barcode);
  const response = await fetchWithTimeout(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: `Convert halal scanner analysis text into STRICT JSON only.
Use only facts explicitly stated in the supplied text. Do not add product facts, ingredients, halal status, or certainty from your own knowledge.
If the text does not clearly identify the exact scanned barcode/product, return Unknown Product with status unknown and confidence <= 20.
If the text identifies a product but ingredients or halal evidence are incomplete, use status unknown or mushbooh conservatively.
Return exactly the required schema and no prose.`,
          },
          {
            role: "user",
            content: [
              `Scanned barcode: ${body.barcode ?? "Not provided"}`,
              barcodeCandidates.length > 1 ? `Barcode aliases: ${barcodeCandidates.join(", ")}` : null,
              `Original model: ${originalModel}`,
              "Non-JSON model output to convert:",
              rawContent,
            ].filter(Boolean).join("\n"),
          },
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
        max_tokens: 900,
      }),
    },
    AI_TIMEOUT_MS,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter JSON repair API ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = extractAiContent(data);
  const json = extractJsonObject(content);

  if (!json) {
    throw new Error("OpenRouter JSON repair returned non-JSON content");
  }

  const parsed = JSON.parse(json);
  if (!isValidAiResult(parsed)) {
    throw new Error("OpenRouter JSON repair returned an invalid halal analysis schema");
  }

  return parsed;
}

async function callOpenAIWithModel(
  body: ScanRequest,
  productFacts: ProductLookup | null,
  model: string,
  allowWebSearch: boolean,
  timeoutMs: number,
): Promise<AIResult> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const parts: string[] = [];

  const barcodeCandidates = getBarcodeCandidates(body.barcode);
  if (body.barcode) {
    parts.push(`Scanned barcode: ${body.barcode}`);
    if (barcodeCandidates.length > 1) {
      parts.push(`Barcode aliases to check: ${barcodeCandidates.join(", ")}`);
      parts.push("Treat UPC-A and leading-zero EAN-13 forms as the same product when reasoning from barcode knowledge.");
    }
  }
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
  } else if (allowWebSearch) {
    parts.push(
      body.barcode
        ? `No verified barcode lookup facts were found for the scanned barcode or its aliases. Call web_search now for the exact barcode candidate(s): ${barcodeCandidates.join(", ")}. Do not answer from memory. If search results do not identify this exact barcode or an equivalent UPC/EAN alias, return Unknown Product with status unknown.`
        : "No verified barcode lookup facts were found. If an image was supplied, try to read the ingredients panel directly first, and only use web_search if it is not legible.",
    );
  } else {
    parts.push(
      body.barcode
        ? "No verified barcode lookup facts were found for the scanned barcode or its aliases. Do not identify the product from the barcode number alone. Return Unknown Product with status unknown unless a supplied image/label gives reliable product facts."
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

  const requestBody: Record<string, unknown> = {
    model,
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
  };

  if (allowWebSearch) {
    requestBody.tools = [WEB_SEARCH_TOOL];
    requestBody.max_tool_calls = 3;
  }

  const response = await fetchWithTimeout(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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
  const sources = extractWebCitations(data);

  if (!content) {
    throw new Error("OpenRouter returned an empty structured response");
  }

  let parsed: unknown;

  try {
    const json = extractJsonObject(content);
    if (!json) {
      throw new Error(`No JSON object found in response: ${content.slice(0, 120)}`);
    }
    parsed = JSON.parse(json);
  } catch (error) {
    console.error(`OpenRouter model ${model} returned non-JSON; attempting JSON repair:`, error);
    parsed = await repairAiResultJson(content, body, model, apiKey);
  }

  if (!isValidAiResult(parsed)) {
    throw new Error(
      "OpenRouter returned a response that does not match the halal analysis schema",
    );
  }

  return {
    ...parsed,
    ai_model: model,
    web_search_used: allowWebSearch || sources.length > 0,
    sources: sources.length > 0 ? sources : undefined,
  };
}

async function callOpenAI(
  body: ScanRequest,
  productFacts: ProductLookup | null,
  options: { allowWebSearch?: boolean } = {},
): Promise<AIResult> {
  const allowWebSearch = options.allowWebSearch ?? false;
  const timeoutMs = allowWebSearch ? AI_TIMEOUT_MS_WITH_SEARCH : AI_TIMEOUT_MS;
  const modelFallbacks = allowWebSearch ? AI_WEB_SEARCH_MODEL_FALLBACKS : AI_MODEL_FALLBACKS;
  let firstUnknown: AIResult | null = null;
  let lastError: unknown = null;

  for (const model of modelFallbacks) {
    try {
      const result = await callOpenAIWithModel(
        body,
        productFacts,
        model,
        allowWebSearch,
        timeoutMs,
      );
      if (result.status !== "unknown") return result;
      firstUnknown ??= result;
    } catch (error) {
      lastError = error;
      console.error(`OpenRouter model ${model} failed:`, error);
    }
  }

  if (firstUnknown) return firstUnknown;
  throw lastError instanceof Error ? lastError : new Error("All OpenRouter models failed");
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

async function getCacheEvidenceHash(parsed: any): Promise<string> {
  const ingredientsHash = await getIngredientsHash(parsed);
  if (ingredientsHash) return ingredientsHash;

  const metadataEvidence = [
    parsed?.product_name,
    parsed?.brand,
    parsed?.category,
    parsed?.region,
    parsed?.source,
  ]
    .map((value) => typeof value === "string" ? value.trim().toLowerCase() : "")
    .filter(Boolean)
    .join("|");

  return sha256Hex(`metadata|${metadataEvidence || "unknown-product"}`);
}

function getAiModelFromSource(source: unknown): string | null {
  return typeof source === "string" && source.includes("openrouter_ai") ? AI_MODEL : null;
}

async function writeProductCache(
  supabase: any,
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

  const ingredientsHash = await getCacheEvidenceHash(parsed);
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
    ai_model: typeof parsed?.ai_model === "string" ? parsed.ai_model : getAiModelFromSource(source),
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

async function writeScanHistory(
  supabase: any,
  parsed: any,
  productCacheId: string | null,
  userId: string | null,
  normalizedBarcode: string | null,
) {
  try {
    const { data, error } = await supabase
      .from("scan_history")
      .insert(buildScanHistoryRow(parsed, productCacheId, userId, normalizedBarcode))
      .select()
      .single();

    if (error) {
      console.error("scan_history insert error:", error);
      return null;
    }

    return data;
  } catch (e) {
    console.error("scan_history write error:", e);
    return null;
  }
}

async function getRequestUserId(
  supabase: any,
  req: Request,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token || token.split(".").length !== 3) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function analyzeLookupFacts(lookupFacts: ProductLookup, body: ScanRequest) {
  const deterministicResult = runDeterministicHalalCheck(lookupFacts, body);

  try {
    const aiResult = await callOpenAI(body, lookupFacts);
    return deterministicResult.status === "unknown"
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
    console.error(`AI verification failed after ${lookupFacts.source} result:`, error);
    return deterministicResult.status === "unknown"
      ? runMetadataHalalHeuristic(lookupFacts, body)
      : {
          ...deterministicResult,
          verdict: `${deterministicResult.verdict} AI verification failed, so this result is based on deterministic rules only.`,
          source: `${lookupFacts.source}_deterministic_rules`,
        };
  }
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
    const barcodeCandidates = getBarcodeCandidates(body.barcode);

    if (normalizedBarcode) {
      try {
        const { data: cached, error: cacheReadError } = await supabase
          .from("product_halal_cache")
          .select("*")
          .in("normalized_barcode", barcodeCandidates)
          .order("updated_at", { ascending: false })
          .limit(1)
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

          const scan = await writeScanHistory(supabase, cachedResult, cached.id ?? null, userId, normalizedBarcode);
          return jsonResponse({ scan, result: cachedResult });
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
      parsed = await analyzeLookupFacts(lookupFacts, body);
    } else {
      try {
        parsed = await callOpenAI(body, null);
        parsed.source = body.imageBase64 ? "openrouter_ai_image" : "openrouter_ai_barcode_lookup_miss";
      } catch (error) {
        console.error("AI fallback failed after barcode lookup miss:", error);
        parsed = unknownBarcodeResult(body);
      }

      if (parsed?.status === "unknown") {
        try {
          const webSearchResult = await callOpenAI(body, null, { allowWebSearch: true });
          parsed = {
            ...webSearchResult,
            source: webSearchResult.web_search_used
              ? "openrouter_web_search"
              : "openrouter_ai_barcode_lookup_miss",
          };
        } catch (error) {
          console.error("AI web-search fallback failed after barcode lookup miss:", error);
        }
      }

      if (parsed?.status === "unknown" && normalizedBarcode) {
        const productSearchFacts = await lookupProductSearch(body.barcode);
        if (productSearchFacts) {
          parsed = await analyzeLookupFacts(productSearchFacts, body);
        }
      }
    }

    const cachedProduct = await writeProductCache(supabase, normalizedBarcode, parsed);
    const scan = await writeScanHistory(
      supabase,
      parsed,
      cachedProduct?.id ?? null,
      userId,
      normalizedBarcode,
    );

    return jsonResponse({ scan, result: parsed });
  } catch (e) {
    console.error("scan-halal error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
