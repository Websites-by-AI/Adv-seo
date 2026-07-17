// Helper to check whether a business appears to already have a Google Maps /
// Google Business Profile listing.
//
// If a `GOOGLE_MAPS_API_KEY` (or `GOOGLE_PLACES_API_KEY`) environment
// variable is configured, this performs a real Google Places "Text Search"
// lookup. Otherwise it gracefully falls back to "unknown", and returns a
// ready-to-click Google Maps search link so the result can be confirmed
// manually with one click.

import { googleMapsSearchUrl } from "@/lib/maps-url";

export type GoogleCheckResult = {
  status: "found" | "not_found" | "unknown";
  placeName?: string;
  mapsUrl?: string;
  raw?: unknown;
};

export function hasGoogleApiKey(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY);
}

function getApiKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
}

export function manualSearchUrl(name: string, address?: string | null) {
  return googleMapsSearchUrl(name, address);
}

export async function checkCompanyOnGoogle(
  name: string,
  address?: string | null,
): Promise<GoogleCheckResult> {
  const apiKey = getApiKey();
  const fallbackUrl = manualSearchUrl(name, address);

  if (!apiKey) {
    return { status: "unknown", mapsUrl: fallbackUrl };
  }

  try {
    const query = [name, address].filter(Boolean).join(" ");
    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    url.searchParams.set("query", query);
    url.searchParams.set("language", "fa");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return { status: "unknown", mapsUrl: fallbackUrl };
    }
    const data = (await res.json()) as {
      status: string;
      results?: Array<{ name?: string; place_id?: string }>;
    };

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const top = data.results[0];
      const mapsUrl = top.place_id
        ? `https://www.google.com/maps/place/?q=place_id:${top.place_id}`
        : fallbackUrl;
      return {
        status: "found",
        placeName: top.name,
        mapsUrl,
        raw: data,
      };
    }

    if (data.status === "ZERO_RESULTS") {
      return { status: "not_found", mapsUrl: fallbackUrl, raw: data };
    }

    // Any other API status (e.g. quota / key errors) - don't guess.
    return { status: "unknown", mapsUrl: fallbackUrl, raw: data };
  } catch {
    return { status: "unknown", mapsUrl: fallbackUrl };
  }
}
