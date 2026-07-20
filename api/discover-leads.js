import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 900_000;
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_ENGINES = ["duckduckgo", "bing", "brave"];

function isPrivateAddress(address) {
  const value = String(address).toLowerCase().split("%")[0];
  if (value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(value)) return true;
  if (value.startsWith("::ffff:")) return isPrivateAddress(value.slice(7));
  if (isIP(value) !== 4) return false;
  const [a, b] = value.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

async function assertPublicUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol not allowed");
  if (url.username || url.password) throw new Error("credentials not allowed");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("private host blocked");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("private network blocked");
  }
  return url;
}

async function safeFetch(rawUrl, init = {}) {
  let current = String(rawUrl);
  for (let redirect = 0; redirect <= 4; redirect += 1) {
    const checked = await assertPublicUrl(current);
    const response = await fetch(checked, {
      method: init.method || "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(init.timeoutMs || 10_000),
      headers: {
        accept: init.accept || "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        "accept-language": "fa-IR,fa;q=0.9,en;q=0.5",
        "user-agent":
          init.userAgent ||
          "Mozilla/5.0 (compatible; LeadfarLeadBot/1.0; +https://leadfar.app)",
      },
      body: init.body,
    });
    if (REDIRECT_CODES.has(response.status) && response.headers.get("location")) {
      current = new URL(response.headers.get("location"), checked).toString();
      await response.body?.cancel();
      continue;
    }
    return { response, finalUrl: checked.toString() };
  }
  throw new Error("too many redirects");
}

async function readLimited(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(merged);
}

function stripTags(value = "") {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&(quot|apos|lt|gt);/gi, (_, name) => ({ quot: '"', apos: "'", lt: "<", gt: ">" }[name] || " "))
    .replace(/\s+/g, " ")
    .trim();
}

const BLOCKED_HOSTS = new Set([
  "www.google.com",
  "google.com",
  "www.bing.com",
  "bing.com",
  "duckduckgo.com",
  "html.duckduckgo.com",
  "search.brave.com",
  "www.yahoo.com",
  "yahoo.com",
  "en.wikipedia.org",
  "fa.wikipedia.org",
  "wikipedia.org",
  "www.instagram.com",
  "instagram.com",
  "www.facebook.com",
  "facebook.com",
  "www.linkedin.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "www.youtube.com",
  "www.aparat.com",
  "aparat.com",
  "divar.ir",
  "sheypoor.com",
  "www.sheypoor.com",
  "yelp.com",
  "www.yelp.com",
]);

function extractHost(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function keepResult(url) {
  const host = extractHost(url);
  if (!host) return false;
  if (BLOCKED_HOSTS.has(host) || BLOCKED_HOSTS.has(`www.${host}`)) return false;
  return true;
}

function dedupeByHost(results) {
  const seen = new Set();
  const out = [];
  for (const result of results) {
    const host = extractHost(result.url);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    out.push({ ...result, host });
  }
  return out;
}

// --- Search engine parsers ---

async function searchDuckDuckGo(query, limit) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=ir-fa`;
  const { response } = await safeFetch(url, { timeoutMs: 8000 });
  const html = await readLimited(response);
  const results = [];
  const anchorRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) && results.length < limit * 2) {
    let href = match[1];
    // DDG wraps real URL in /l/?uddg=…
    try {
      const parsed = new URL(href, "https://duckduckgo.com/");
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) href = decodeURIComponent(uddg);
    } catch {
      /* keep raw */
    }
    if (!/^https?:\/\//i.test(href)) continue;
    if (!keepResult(href)) continue;
    results.push({ url: href, title: stripTags(match[2] || ""), source: "duckduckgo" });
  }
  return results;
}

async function searchBing(query, limit) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&cc=ir&setlang=fa`;
  const { response } = await safeFetch(url, { timeoutMs: 8000 });
  const html = await readLimited(response);
  const results = [];
  const blockRegex = /<li class="b_algo"[\s\S]*?<h2>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = blockRegex.exec(html)) && results.length < limit * 2) {
    const href = match[1];
    if (!/^https?:\/\//i.test(href)) continue;
    if (!keepResult(href)) continue;
    results.push({ url: href, title: stripTags(match[2] || ""), source: "bing" });
  }
  return results;
}

async function searchBrave(query, limit) {
  const url = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`;
  const { response } = await safeFetch(url, { timeoutMs: 8000 });
  const html = await readLimited(response);
  const results = [];
  const anchorRegex = /<a[^>]+class="[^"]*result-header[^"]*"[^>]+href="([^"]+)"[^>]*>[\s\S]*?<span[^>]+class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) && results.length < limit * 2) {
    const href = match[1];
    if (!/^https?:\/\//i.test(href)) continue;
    if (!keepResult(href)) continue;
    results.push({ url: href, title: stripTags(match[2] || ""), source: "brave" });
  }
  return results;
}

const ENGINE_MAP = {
  duckduckgo: searchDuckDuckGo,
  bing: searchBing,
  brave: searchBrave,
};

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });

  const rawQuery = Array.isArray(request.query?.q) ? request.query.q[0] : request.query?.q;
  if (!rawQuery || String(rawQuery).trim().length < 2) {
    return response.status(400).json({ error: "پارامتر q الزامی است.", results: [] });
  }

  const limitRaw = Array.isArray(request.query?.limit) ? request.query.limit[0] : request.query?.limit;
  const limit = Math.min(Math.max(Number(limitRaw) || 12, 3), 30);

  const enginesRaw = Array.isArray(request.query?.engines)
    ? request.query.engines[0]
    : request.query?.engines;
  const requestedEngines = enginesRaw
    ? String(enginesRaw)
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter((value) => Object.hasOwn(ENGINE_MAP, value))
    : DEFAULT_ENGINES;
  const engines = requestedEngines.length ? requestedEngines : DEFAULT_ENGINES;

  const errors = [];
  const combined = [];

  await Promise.all(
    engines.map(async (engine) => {
      try {
        const partial = await ENGINE_MAP[engine](String(rawQuery), limit);
        combined.push(...partial);
      } catch (error) {
        errors.push({ engine, message: error instanceof Error ? error.message : "failed" });
      }
    }),
  );

  const deduped = dedupeByHost(combined).slice(0, limit);

  return response.status(200).json({
    query: String(rawQuery),
    engines,
    count: deduped.length,
    results: deduped,
    errors,
    message: deduped.length
      ? `${deduped.length} نتیجه یافت شد`
      : "نتیجه‌ای یافت نشد — کلمه کلیدی را دقیق‌تر بنویسید",
  });
}
