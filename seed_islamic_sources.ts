// One-time (or re-run when the source files change) ingestion script.
// Loads quran_ar.json, sahih_bukhari.json, sahih_muslim.json into the
// tables created by migrations/0001_islamic_sources.sql.
//
// Run locally (NOT as an edge function — it needs the service role key
// and can take a couple of minutes for ~14.6k hadith rows):
//
//   SUPABASE_URL="https://xxxx.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="ey..." \
//   deno run --allow-net --allow-env --allow-read seed_islamic_sources.ts \
//     ./quran_ar.json ./sahih_bukhari.json ./sahih_muslim.json
//
// Get the service role key from Project Settings -> API in Supabase.
// Never expose it client-side or commit it — it bypasses RLS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  Deno.exit(1);
}

const [quranPath, bukhariPath, muslimPath] = Deno.args;
if (!quranPath || !bukhariPath || !muslimPath) {
  console.error(
    "Usage: deno run --allow-net --allow-env --allow-read seed_islamic_sources.ts <quran_ar.json> <sahih_bukhari.json> <sahih_muslim.json>",
  );
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const BATCH_SIZE = 500;

async function insertBatches<T>(table: string, rows: T[]) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`Error inserting into ${table} at offset ${i}:`, error.message);
      Deno.exit(1);
    }
    console.log(`  ${table}: inserted ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
}

// ---- Qur'an ----
console.log("Loading Qur'an...");
const quranRaw = JSON.parse(await Deno.readTextFile(quranPath)) as Array<{
  name: string;
  ayahs: Array<{ number: number; text: string }>;
}>;

const quranRows = quranRaw.flatMap((surah, idx) => {
  const surahNumber = idx + 1; // "Surah 1", "Surah 2", ... in file order
  return surah.ayahs.map((ayah) => ({
    surah_number: surahNumber,
    surah_name: surah.name,
    ayah_number: ayah.number,
    text_ar: ayah.text,
  }));
});

console.log(`Clearing existing quran_ayahs, inserting ${quranRows.length} ayat...`);
await supabase.from("quran_ayahs").delete().neq("id", 0);
await insertBatches("quran_ayahs", quranRows);

// ---- Hadith ----
type HadithRaw = {
  Book: string;
  Chapter_Number: number;
  Chapter_Title_Arabic: string;
  Chapter_Title_English: string;
  Arabic_Text: string;
  English_Text: string;
  Grade: string;
  Reference: string;
  "In-book reference": string;
};

async function loadHadith(path: string, collection: "bukhari" | "muslim") {
  console.log(`Loading ${collection}...`);
  const raw = JSON.parse(await Deno.readTextFile(path)) as HadithRaw[];
  const rows = raw.map((h) => ({
    collection,
    book: h.Book,
    chapter_number: h.Chapter_Number,
    chapter_title_ar: h.Chapter_Title_Arabic,
    chapter_title_en: h.Chapter_Title_English,
    arabic_text: h.Arabic_Text,
    english_text: h.English_Text,
    grade: h.Grade || null,
    reference: h.Reference,
    in_book_reference: h["In-book reference"],
  }));
  console.log(`Clearing existing ${collection} rows, inserting ${rows.length}...`);
  await supabase.from("hadiths").delete().eq("collection", collection);
  await insertBatches("hadiths", rows);
}

await loadHadith(bukhariPath, "bukhari");
await loadHadith(muslimPath, "muslim");

console.log("Done.");
