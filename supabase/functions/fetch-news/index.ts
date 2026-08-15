import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NewsCategory = "world" | "education" | "community" | "charity" | "business" | "politics";

interface NewsSource {
  name: string;
  rss_url: string;
  category: NewsCategory;
}

interface NewsArticleRow extends Omit<ParsedItem, "source"> {
  source_name: string;
  category: NewsCategory;
}

const DEFAULT_SOURCES: NewsSource[] = [
  { name: "Al Jazeera", rss_url: "https://www.aljazeera.com/xml/rss/all.xml", category: "world" },
  { name: "Middle East Eye", rss_url: "https://www.middleeasteye.net/rss", category: "world" },
  { name: "TRT World", rss_url: "https://www.trtworld.com/rss", category: "world" },
  { name: "Islamic Relief Worldwide", rss_url: "https://islamic-relief.org/feed/", category: "charity" },
  { name: "Islamic Relief Press Releases", rss_url: "https://islamic-relief.org/news_category/press-releases/feed/", category: "charity" },
  { name: "Muslim Matters", rss_url: "https://muslimmatters.org/feed/", category: "education" },
  { name: "About Islam", rss_url: "https://aboutislam.net/feed/", category: "community" },
  { name: "The Muslim Vibe", rss_url: "https://themuslimvibe.com/feed/", category: "community" },
  { name: "Islamic Finance Guru", rss_url: "https://www.islamicfinanceguru.com/feed/", category: "business" },
  { name: "Middle East Eye Politics", rss_url: "https://www.middleeasteye.net/rss", category: "politics" },
];

const NEWS_CATEGORIES = new Set<NewsCategory>(["world", "education", "community", "charity", "business", "politics"]);
const MAX_ITEMS_PER_SOURCE = 10;

function normalizeCategory(value: unknown): NewsCategory {
  return typeof value === "string" && NEWS_CATEGORIES.has(value as NewsCategory)
    ? value as NewsCategory
    : "world";
}

function isRateLimitedSearchFeed(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "news.google.com" && parsed.pathname.startsWith("/rss/search");
  } catch {
    return false;
  }
}

function isUsableSource(source: NewsSource): boolean {
  return Boolean(source.name?.trim()) && Boolean(source.rss_url?.trim()) && !isRateLimitedSearchFeed(source.rss_url);
}

function mergeSources(sources: NewsSource[]): NewsSource[] {
  const merged = new Map<string, NewsSource>();
  for (const source of [...DEFAULT_SOURCES, ...sources].filter(isUsableSource)) {
    const category = normalizeCategory(source.category);
    const key = `${category}:${source.rss_url}`;
    if (merged.has(key)) continue;
    merged.set(key, {
      ...source,
      category,
    });
  }
  return [...merged.values()];
}

function ensureCategoryCoverage(sources: NewsSource[]): NewsSource[] {
  const activeCategories = new Set(sources.map((source) => source.category));
  const missingDefaults = DEFAULT_SOURCES.filter((source) => !activeCategories.has(source.category));
  return [...sources, ...missingDefaults];
}

function itemCategory(sourceCategory: NewsCategory): NewsCategory {
  // Feeds are intentionally assigned to app sections, so keep articles in the
  // source's configured section instead of letting keyword matching empty a tab.
  return sourceCategory;
}

async function requestedCategory(req: Request): Promise<NewsCategory | null> {
  try {
    const body = await req.json();
    const category = body?.category;
    return typeof category === "string" && NEWS_CATEGORIES.has(category as NewsCategory)
      ? category as NewsCategory
      : null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 9000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": "BarakahNewsBot/1.0 (+https://barakah.app)" },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function pick(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  return decode(stripCData(m[1]).trim());
}

function pickAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["'][^>]*\\/?>`, "i");
  const m = xml.match(re);
  return m ? m[1] : null;
}

function pickAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) out.push(decode(stripCData(m[1]).trim()));
  return out;
}

function stripCData(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripHtml(s: string | null): string | null {
  if (!s) return null;
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToParagraphHtml(text: string): string | null {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  const chunks = clean
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .reduce<string[]>((acc, sentence) => {
      const last = acc[acc.length - 1] ?? "";
      if (!last || last.length > 420) acc.push(sentence);
      else acc[acc.length - 1] = `${last} ${sentence}`;
      return acc;
    }, [])
    .slice(0, 6);
  return chunks.map((chunk) => `<p>${escapeHtml(chunk)}</p>`).join("");
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractImage(itemXml: string): string | null {
  const enclosure = pickAttr(itemXml, "enclosure", "url");
  if (enclosure) return enclosure;
  const mediaContent = pickAttr(itemXml, "media:content", "url");
  if (mediaContent) return mediaContent;
  const mediaThumb = pickAttr(itemXml, "media:thumbnail", "url");
  if (mediaThumb) return mediaThumb;
  const html = pick(itemXml, "content:encoded") || pick(itemXml, "description") || "";
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
}

interface ParsedItem {
  guid: string;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  article_url: string;
  published_at: string | null;
  author: string | null;
  tags: string[];
  source?: string | null;
}

function parseRss(xml: string): ParsedItem[] {
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  const items: ParsedItem[] = [];
  for (const block of itemBlocks) {
    const title = pick(block, "title") || "";
    let link = pick(block, "link");
    if (!link) link = pickAttr(block, "link", "href");
    if (!title || !link) continue;
    const guid = pick(block, "guid") || pick(block, "id") || link;
    const description = stripHtml(pick(block, "description") || pick(block, "summary"));
    const content = stripHtml(pick(block, "content:encoded") || pick(block, "content"));
    const pub = pick(block, "pubDate") || pick(block, "published") || pick(block, "updated");
    const author = stripHtml(pick(block, "dc:creator") || pick(block, "author"));
    const tags = pickAll(block, "category").filter(Boolean).slice(0, 10);
    const source = stripHtml(pick(block, "source"));
    items.push({
      guid,
      title,
      description,
      content,
      image_url: extractImage(block),
      article_url: link,
      published_at: parseDate(pub),
      author,
      tags,
      source,
    });
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ success: false, error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const categoryFilter = await requestedCategory(req);
    const { data: sources, error: srcErr } = await supabase
      .from("news_sources")
      .select("name, rss_url, category")
      .eq("is_active", true);
    if (srcErr) throw srcErr;

    const activeSources = ensureCategoryCoverage(mergeSources((sources ?? []).map((source) => ({
      name: source.name,
      rss_url: source.rss_url,
      category: normalizeCategory(source.category),
    }))));
    const filteredSources = categoryFilter
      ? activeSources.filter((source) => source.category === categoryFilter)
      : activeSources;

    let totalProcessed = 0;
    const results: Record<string, number | string> = {};
    const articles: NewsArticleRow[] = [];
    const categories: Record<NewsCategory, number> = {
      world: 0,
      education: 0,
      community: 0,
      charity: 0,
      business: 0,
      politics: 0,
    };
    const processSource = async (src: NewsSource) => {
      try {
        const res = await fetchWithTimeout(src.rss_url);
        if (!res.ok) {
          return { source: src.name, result: `HTTP ${res.status}`, total: 0, rowCategories: [] as NewsCategory[] };
        }
        const xml = await res.text();
        const items = parseRss(xml).slice(0, MAX_ITEMS_PER_SOURCE);
        const rows: NewsArticleRow[] = [];
        const rowCategories: NewsCategory[] = [];
        for (const it of items) {
          const category = itemCategory(src.category);
          const { source, ...articleItem } = it;
          rows.push({
            ...articleItem,
            guid: `${category}:${src.name}:${it.guid}`,
            content: it.content || (it.description ? textToParagraphHtml(it.description) : null),
            source_name: source || src.name,
            category,
            published_at: it.published_at || new Date().toISOString(),
          });
          rowCategories.push(category);
        }
        if (rows.length) {
          const { error } = await supabase.from("news_articles").upsert(rows, { onConflict: "guid" });
          if (error) {
            return { source: src.name, result: `DB: ${error.message}`, total: rows.length, rowCategories, rows };
          }
        }
        return { source: src.name, result: rows.length, total: rows.length, rowCategories, rows };
      } catch (e) {
        return { source: src.name, result: `ERR: ${(e as Error).message}`, total: 0, rowCategories: [] as NewsCategory[], rows: [] };
      }
    };

    const settledSources = await Promise.allSettled(filteredSources.map(processSource));
    for (const settled of settledSources) {
      if (settled.status === "rejected") {
        results.unknown = `ERR: ${settled.reason?.message ?? "Unknown source error"}`;
        continue;
      }
      results[settled.value.source] = settled.value.result;
      totalProcessed += settled.value.total;
      settled.value.rowCategories.forEach((category) => {
        categories[category] += 1;
      });
      articles.push(...settled.value.rows);
    }

    articles.sort((a, b) =>
      new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
    );

    return new Response(JSON.stringify({ success: true, totalProcessed, categories, results, articles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
