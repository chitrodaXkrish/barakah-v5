import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
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
    items.push({
      guid,
      title,
      description,
      content,
      image_url: extractImage(block),
      article_url: link,
      published_at: pub ? new Date(pub).toISOString() : null,
      author,
      tags,
    });
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: sources, error: srcErr } = await supabase
      .from("news_sources")
      .select("name, rss_url, category")
      .eq("is_active", true);
    if (srcErr) throw srcErr;

    let totalInserted = 0;
    const results: Record<string, number | string> = {};

    for (const src of sources ?? []) {
      try {
        const res = await fetch(src.rss_url, {
          headers: { "User-Agent": "BarakahNewsBot/1.0" },
        });
        if (!res.ok) {
          results[src.name] = `HTTP ${res.status}`;
          continue;
        }
        const xml = await res.text();
        const items = parseRss(xml);
        const rows = items.map((it) => ({
          ...it,
          source_name: src.name,
          category: src.category,
        }));
        if (rows.length) {
          const { error } = await supabase
            .from("news_articles")
            .upsert(rows, { onConflict: "guid", ignoreDuplicates: true });
          if (error) {
            results[src.name] = `DB: ${error.message}`;
            continue;
          }
        }
        results[src.name] = rows.length;
        totalInserted += rows.length;
      } catch (e) {
        results[src.name] = `ERR: ${(e as Error).message}`;
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalProcessed: totalInserted, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});