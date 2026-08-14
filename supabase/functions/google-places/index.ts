import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PlaceType = "mosque" | "restaurant";

type PlacesRequest = {
  lat?: number;
  lon?: number;
  type?: PlaceType;
  radius?: number;
};

const MIN_RESULT_COUNT = 8;
const MAX_RESULT_COUNT = 30;

const clampRadius = (value: unknown) => {
  const radius = Number(value);
  if (!Number.isFinite(radius)) return 15000;
  return Math.min(50000, Math.max(1000, radius));
};

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const earthKm = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const searchRadii = (maxRadius: number) => {
  const base = [1000, 2000, 3500, 5000, 8000, 12000, 20000, 30000, 50000];
  return Array.from(new Set([...base.filter((radius) => radius <= maxRadius), maxRadius])).sort((a, b) => a - b);
};

const searchQueries = (type: PlaceType) =>
  type === "mosque"
    ? ["mosque", "masjid", "jama masjid", "islamic centre", "islamic center", "muslim prayer room"]
    : ["halal restaurant", "halal food", "halal takeaway", "halal cafe"];

const googleSearchBody = (lat: number, lon: number, query: string, radius: number) => ({
  textQuery: query,
  pageSize: 20,
  rankPreference: "DISTANCE",
  locationBias: {
    circle: {
      center: { latitude: lat, longitude: lon },
      radius,
    },
  },
});

const mapGooglePlace = (place: any, lat: number, lon: number, type: PlaceType) => {
  const placeLat = Number(place?.location?.latitude);
  const placeLon = Number(place?.location?.longitude);
  if (!Number.isFinite(placeLat) || !Number.isFinite(placeLon)) return null;

  return {
    id: place.id,
    name: place.displayName?.text || (type === "mosque" ? "Mosque" : "Halal Restaurant"),
    lat: placeLat,
    lon: placeLon,
    distance: distanceKm(lat, lon, placeLat, placeLon),
    address: place.shortFormattedAddress || place.formattedAddress || null,
    type,
    source: "google_places",
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "GOOGLE_PLACES_API_KEY is not configured" }, 500);
    }

    const body = (await req.json()) as PlacesRequest;
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    const type = body.type;

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (type !== "mosque" && type !== "restaurant")) {
      return jsonResponse({ error: "lat, lon, and valid type are required" }, 400);
    }

    const radius = clampRadius(body.radius);
    const seen = new Set<string>();
    const places: any[] = [];
    let lastGoogleError: { message: string; status: number } | null = null;

    for (const searchRadius of searchRadii(radius)) {
      for (const query of searchQueries(type)) {
        const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": [
              "places.id",
              "places.displayName",
              "places.formattedAddress",
              "places.shortFormattedAddress",
              "places.location",
              "places.types",
              "places.primaryType",
            ].join(","),
          },
          body: JSON.stringify(googleSearchBody(lat, lon, query, searchRadius)),
        });

        const data = await response.json();
        if (!response.ok) {
          lastGoogleError = {
            message: data?.error?.message || `Google Places returned ${response.status}`,
            status: response.status,
          };
          break;
        }

        const mapped = Array.isArray(data?.places)
          ? data.places
              .map((place: any) => mapGooglePlace(place, lat, lon, type))
              .filter(Boolean)
          : [];

        for (const place of mapped) {
          const key = place.id || `${Math.round(place.lat * 100000)}:${Math.round(place.lon * 100000)}:${place.name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          places.push(place);
        }

        places.sort((a, b) => a.distance - b.distance);
        if (places.length >= MIN_RESULT_COUNT) break;
      }

      if (lastGoogleError) break;
      if (places.length >= MIN_RESULT_COUNT) break;
    }

    if (lastGoogleError && places.length === 0) {
      return jsonResponse({ error: lastGoogleError.message }, lastGoogleError.status);
    }

    return jsonResponse({ places: places.slice(0, MAX_RESULT_COUNT) });
  } catch (error) {
    console.error("google-places error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
