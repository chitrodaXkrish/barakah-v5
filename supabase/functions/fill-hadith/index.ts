import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SLUG_MAP: Record<string, string> = {
  bukhari: 'sahih-bukhari',
  muslim: 'sahih-muslim',
  abudawud: 'abu-dawood',
  tirmidhi: 'al-tirmidhi',
  nasai: 'sunan-nasai',
  ibnmajah: 'ibn-e-majah',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('HADITH_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'HADITH_API_KEY missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const slug = String(body?.slug || '');
    const numbers = Array.isArray(body?.numbers) ? body.numbers : [];
    const apiSlug = SLUG_MAP[slug];
    if (!apiSlug) {
      return new Response(JSON.stringify({ error: 'Unsupported book', results: {} }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const wanted = numbers
      .map((n: unknown) => Number(n))
      .filter((n: number) => Number.isFinite(n) && n > 0)
      .slice(0, 40);

    const results: Record<string, { text: string; arabic?: string }> = {};

    await Promise.all(
      wanted.map(async (num: number) => {
        const url = `https://hadithapi.com/api/hadiths?apiKey=${encodeURIComponent(apiKey)}&book=${apiSlug}&hadithNumber=${num}`;
        try {
          const r = await fetch(url);
          if (!r.ok) return;
          const j = await r.json();
          const item = j?.hadiths?.data?.[0];
          const text: string | undefined = item?.hadithEnglish;
          const arabic: string | undefined = item?.hadithArabic;
          if (text && text.trim().length > 0) {
            results[String(num)] = { text, arabic };
          }
        } catch (_) {
          // skip
        }
      }),
    );

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});