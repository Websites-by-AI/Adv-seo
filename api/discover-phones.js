import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 900_000;
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);
const CONTACT_PATHS = [
  "/",
  "/contact",
  "/contact-us",
  "/contactus",
  "/تماس-با-ما",
  "/تماس",
  "/ارتباط-با-ما",
  "/about",
  "/about-us",
  "/درباره-ما",
];

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
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("only HTTP/HTTPS allowed");
  if (url.username || url.password) throw new Error("credentials not allowed");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("port not allowed");
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

async function safeFetch(rawUrl) {
  let current = String(rawUrl);
  for (let redirect = 0; redirect <= 4; redirect += 1) {
    const checked = await assertPublicUrl(current);
    const result = await fetch(checked, {
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        "accept-language": "fa-IR,fa;q=0.9,en;q=0.5",
        "user-agent": "LeadfarPhoneBot/1.0 (+https://leadfar.app)",
      },
    });
    if (REDIRECT_CODES.has(result.status) && result.headers.get("location")) {
      current = new URL(result.headers.get("location"), checked).toString();
      await result.body?.cancel();
      continue;
    }
    return { response: result, finalUrl: checked.toString() };
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

function normalizeIran(raw) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0098")) return `+${digits.slice(2)}`;
  if (digits.startsWith("98") && digits.length >= 11) return `+${digits}`;
  if (digits.startsWith("0")) return `+98${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `+98${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function classifyPhone(e164) {
  // Iranian mobile numbers all begin with +989 and are 13 chars total (+98 + 9xxxxxxxxx)
  const digits = e164.replace(/^\+/, "");
  if (digits.startsWith("989") && digits.length === 12) {
    return { type: "mobile", country: "IR", operator: guessIranOperator(digits) };
  }
  if (digits.startsWith("98") && digits.length >= 10 && digits.length <= 13) {
    return { type: "landline", country: "IR" };
  }
  if (/^[1-9]/.test(digits)) return { type: "international" };
  return { type: "unknown" };
}

function guessIranOperator(digits) {
  // digits starts with "989"
  const prefix = digits.slice(2, 5); // e.g. "912"
  if (["910", "911", "912", "913", "914", "915", "916", "917", "918", "919", "990", "991", "992", "993", "994", "995", "996"].includes(prefix)) return "همراه اول";
  if (["901", "902", "903", "905", "930", "933", "935", "936", "937", "938", "939"].includes(prefix)) return "ایرانسل";
  if (["920", "921", "922"].includes(prefix)) return "رایتل";
  if (["999", "998", "997"].includes(prefix)) return "شاتل موبایل / سایر";
  return "شبکه ایران";
}

function extractPhonesFromHtml(html, page) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const collected = new Map();
  const push = (e164, source) => {
    if (!e164 || e164.length < 8) return;
    if (!collected.has(e164)) {
      const info = classifyPhone(e164);
      collected.set(e164, {
        e164,
        display: e164,
        type: info.type,
        operator: info.operator || null,
        country: info.country || null,
        sources: new Set([source]),
        pages: new Set([page]),
      });
    } else {
      const existing = collected.get(e164);
      existing.sources.add(source);
      existing.pages.add(page);
    }
  };

  // 1) tel:/callto:
  const telRegex = /(?:tel|callto):([+0-9()\-.\s]{6,})/gi;
  let match;
  while ((match = telRegex.exec(cleaned))) {
    const digits = match[1].replace(/[^\d+]/g, "");
    if (digits.length >= 8) push(normalizeIran(digits), "tel:");
  }

  // 2) WhatsApp deep links → these are almost always mobile numbers
  const waRegex = /(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=|whatsapp:\/\/send\?phone=)([+0-9]{6,20})/gi;
  while ((match = waRegex.exec(cleaned))) {
    const digits = match[1].replace(/[^\d+]/g, "");
    if (digits.length >= 8) push(digits.startsWith("+") ? digits : `+${digits}`, "whatsapp");
  }

  // 3) Text patterns
  const text = cleaned.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ");
  const persianMap = { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9", "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  const normalized = text.replace(/[۰-۹٠-٩]/g, (ch) => persianMap[ch] ?? ch);

  // Iranian mobile: 09XX XXX XXXX  (very common) — capture with tolerant spacing
  const mobileRegex = /(?:\+?98[\s\-]?|00\s?98[\s\-]?|0)?9\d[\s\-]?\d{2}[\s\-]?\d{3}[\s\-]?\d{4}/g;
  while ((match = mobileRegex.exec(normalized))) {
    const raw = match[0].replace(/[\s\-]+/g, "");
    const e164 = normalizeIran(raw);
    if (e164.length >= 12) push(e164, "text-mobile");
  }

  // Iranian landline: 021 XXXXXXXX / 026 XXXXXXX
  const landlineRegex = /(?:\+?98[\s\-]?|0)0?[1-8]\d[\s\-]?\d{3}[\s\-]?\d{4}/g;
  while ((match = landlineRegex.exec(normalized))) {
    const raw = match[0].replace(/[\s\-]+/g, "");
    const e164 = normalizeIran(raw);
    if (e164.length >= 12) push(e164, "text-landline");
  }

  return Array.from(collected.values()).map((entry) => ({
    e164: entry.e164,
    display: entry.display,
    type: entry.type,
    operator: entry.operator,
    country: entry.country,
    sources: Array.from(entry.sources),
    pages: Array.from(entry.pages),
  }));
}

async function fetchPagePhones(baseUrl, path) {
  const target = new URL(path, baseUrl).toString();
  try {
    const { response } = await safeFetch(target);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      await response.body?.cancel();
      return [];
    }
    const html = await readLimited(response);
    return extractPhonesFromHtml(html, path);
  } catch {
    return [];
  }
}

function mergePhoneLists(lists) {
  const merged = new Map();
  for (const list of lists) {
    for (const entry of list) {
      if (!merged.has(entry.e164)) {
        merged.set(entry.e164, {
          ...entry,
          sources: new Set(entry.sources),
          pages: new Set(entry.pages),
        });
      } else {
        const existing = merged.get(entry.e164);
        entry.sources.forEach((source) => existing.sources.add(source));
        entry.pages.forEach((page) => existing.pages.add(page));
      }
    }
  }
  return Array.from(merged.values())
    .map((entry) => ({
      e164: entry.e164,
      display: entry.display,
      type: entry.type,
      operator: entry.operator,
      country: entry.country,
      sources: Array.from(entry.sources),
      pages: Array.from(entry.pages),
    }))
    .sort((a, b) => {
      // Mobiles first, then by number of confirming sources
      if (a.type === b.type) return b.sources.length - a.sources.length;
      const order = { mobile: 0, whatsapp: 1, landline: 2, international: 3, unknown: 4 };
      return (order[a.type] ?? 9) - (order[b.type] ?? 9);
    });
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });

  try {
    const rawUrl = Array.isArray(request.query?.url) ? request.query.url[0] : request.query?.url;
    if (!rawUrl) return response.status(400).json({ error: "url is required", phones: [] });

    const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const base = new URL(normalized).origin;

    const results = await Promise.all(CONTACT_PATHS.map((path) => fetchPagePhones(base, path)));
    const merged = mergePhoneLists(results).slice(0, 15);
    const mobiles = merged.filter((entry) => entry.type === "mobile");
    const landlines = merged.filter((entry) => entry.type === "landline");

    return response.status(200).json({
      phones: merged,
      mobileCount: mobiles.length,
      landlineCount: landlines.length,
      pagesCrawled: CONTACT_PATHS,
      message: merged.length
        ? `${merged.length} شماره در ${CONTACT_PATHS.length} صفحه بررسی شد (${mobiles.length} موبایل، ${landlines.length} ثابت)`
        : "شماره‌ای پیدا نشد — سایت شاید فقط شماره ثابت یا هیچ شماره‌ای ندارد",
      auditedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "phone discovery failed";
    return response.status(200).json({ phones: [], mobileCount: 0, landlineCount: 0, message: `جستجو ممکن نبود: ${message}` });
  }
}
