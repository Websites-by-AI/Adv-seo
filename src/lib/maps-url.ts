// Shared, dependency-free helper for building a Google Maps search URL.
// Safe to import from both server and client code (no Node-only APIs).
export function googleMapsSearchUrl(name: string, address?: string | null) {
  const query = [name, address].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
