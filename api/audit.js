import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HTML_BYTES = 1_500_000;
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

function isPrivateAddress(address) {
  const value = address.toLowerCase().split("%")[0];
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
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("فقط آدرس HTTP یا HTTPS مجاز است.");
  if (url.username || url.password) throw new Error("آدرس دارای اطلاعات ورود مجاز نیست.");
  if (url.port && !['80', '443'].includes(url.port)) throw new Error("پورت واردشده مجاز نیست.");

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("ممیزی آدرس محلی یا خصوصی مجاز نیست.");
  }

  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("این دامنه به یک شبکه خصوصی اشاره می‌کند.");
  }
  return url;
}

async function safeFetch(rawUrl, options = {}) {
  let current = String(rawUrl);
  let hops = 0;
  for (let redirect = 0; redirect <= 4; redirect += 1) {
    const checked = await assertPublicUrl(current);
    const result = await fetch(checked, {
      method: options.method || "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        accept: options.accept || "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        "user-agent": "LeadfarAuditBot/1.0 (+https://leadfar.app)",
      },
    });

    if (REDIRECT_CODES.has(result.status) && result.headers.get("location")) {
      current = new URL(result.headers.get("location"), checked).toString();
      hops += 1;
      await result.body?.cancel();
      continue;
    }
    return { response: result, finalUrl: checked.toString(), hops };
  }
  throw new Error("تعداد تغییر مسیرهای وب‌سایت بیش از حد مجاز است.");
}

async function readLimitedText(response) {
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_HTML_BYTES) throw new Error("حجم صفحه برای ممیزی بیش از حد بزرگ است.");
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("حجم صفحه برای ممیزی بیش از حد بزرگ است.");
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
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1]?.trim() || "";
}

function findMeta(html, metaName) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find((item) => [attribute(item, "name"), attribute(item, "property")].some((value) => value.toLowerCase() === metaName));
  return tag ? attribute(tag, "content") : "";
}

async function publicFileExists(url) {
  try {
    const { response } = await safeFetch(url, { accept: "text/plain,application/xml,*/*;q=0.2" });
    const ok = response.status >= 200 && response.status < 400;
    await response.body?.cancel();
    return ok;
  } catch {
    return false;
  }
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });

  try {
    const rawUrl = Array.isArray(request.query?.url) ? request.query.url[0] : request.query?.url;
    if (!rawUrl) return response.status(400).json({ error: "آدرس وب‌سایت ارسال نشده است." });

    const normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const { response: pageResponse, finalUrl, hops } = await safeFetch(normalized);
    const contentType = pageResponse.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && pageResponse.status < 400) {
      await pageResponse.body?.cancel();
      throw new Error("آدرس واردشده یک صفحه HTML نیست.");
    }
    const html = await readLimitedText(pageResponse);
    const final = new URL(finalUrl);
    const origin = final.origin;

    const title = stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    const metaDescription = stripTags(findMeta(html, "description"));
    const h1 = stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
    const linkTags = html.match(/<link\b[^>]*>/gi) || [];
    const canonical = linkTags.some((tag) => attribute(tag, "rel").toLowerCase().split(/\s+/).includes("canonical"));
    const schema = (html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>/gi) || []).length > 0;
    const anchorTags = html.match(/<a\b[^>]*href\s*=\s*["'][^"']+["'][^>]*>/gi) || [];
    const internalLinks = anchorTags.reduce((count, tag) => {
      try {
        const target = new URL(attribute(tag, "href"), final);
        return count + (target.hostname === final.hostname ? 1 : 0);
      } catch {
        return count;
      }
    }, 0);
    const phoneSignal = /(?:tel:|(?:\+?98|0)?9\d{9}|0\d{2,3}[\s-]?\d{7,8})/i.test(html);
    const [robots, sitemap] = await Promise.all([
      publicFileExists(`${origin}/robots.txt`),
      publicFileExists(`${origin}/sitemap.xml`),
    ]);
    const https = final.protocol === "https:";
    const statusOk = pageResponse.status >= 200 && pageResponse.status < 400;

    let score = 0;
    if (statusOk) score += 15;
    if (https) score += 10;
    if (title.length >= 10 && title.length <= 70) score += 15;
    if (metaDescription.length >= 50 && metaDescription.length <= 180) score += 15;
    if (h1) score += 10;
    if (canonical) score += 10;
    if (schema) score += 10;
    if (internalLinks >= 3) score += 5;
    if (robots) score += 5;
    if (sitemap) score += 5;

    const risks = [];
    if (pageResponse.status >= 500) risks.push(`خطای سرور HTTP ${pageResponse.status}؛ ریسک فنی جدی`);
    if (!https) risks.push("گواهی SSL یا HTTPS معتبر پیدا نشد");
    if (hops >= 3) risks.push(`زنجیره ${hops} تغییر مسیر متوالی روی صفحه اصلی`);

    const issues = [];
    if (!statusOk) issues.push(`صفحه با وضعیت HTTP ${pageResponse.status} پاسخ داد`);
    if (!https) issues.push("وب‌سایت از اتصال امن HTTPS استفاده نمی‌کند");
    if (!title) issues.push("عنوان صفحه پیدا نشد");
    else if (title.length < 10 || title.length > 70) issues.push("طول عنوان صفحه برای سئو مناسب نیست");
    if (!metaDescription) issues.push("توضیحات متا پیدا نشد");
    else if (metaDescription.length < 50 || metaDescription.length > 180) issues.push("طول توضیحات متا نیاز به اصلاح دارد");
    if (!h1) issues.push("تیتر اصلی H1 پیدا نشد");
    if (!canonical) issues.push("آدرس Canonical ثبت نشده است");
    if (!schema) issues.push("داده ساختاریافته JSON-LD پیدا نشد");
    if (internalLinks < 3) issues.push("تعداد لینک‌های داخلی صفحه کم است");
    if (!robots) issues.push("فایل robots.txt در دسترس نیست");
    if (!sitemap) issues.push("فایل sitemap.xml در دسترس نیست");
    if (!phoneSignal) issues.push("نشانه واضحی از شماره تماس در صفحه پیدا نشد");

    return response.status(200).json({
      url: normalized,
      finalUrl,
      status: pageResponse.status,
      score,
      mode: "live",
      title,
      metaDescription,
      h1,
      canonical,
      schema,
      internalLinks,
      robots,
      sitemap,
      https,
      phoneSignal,
      redirectHops: hops,
      risks,
      issues,
      auditedAt: new Date().toISOString(),
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "ممیزی وب‌سایت ناموفق بود.";
    const code = /** @type {any} */ (error)?.cause?.code || /** @type {any} */ (error)?.code || "";
    const risks = [];
    if (["ENOTFOUND", "EAI_AGAIN"].includes(code)) risks.push("DNS دامنه پیدا نشد");
    if (["ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(code)) risks.push("اتصال به سرور با تایم‌اوت مواجه شد");
    if (["ERR_TLS_CERT_ALTNAME_INVALID", "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT"].includes(code)) risks.push("گواهی SSL دامنه معتبر نیست");

    return response.status(200).json({
      error: raw,
      mode: "live",
      status: 0,
      score: 0,
      https: false,
      title: "",
      metaDescription: "",
      h1: "",
      canonical: false,
      schema: false,
      internalLinks: 0,
      robots: false,
      sitemap: false,
      phoneSignal: false,
      redirectHops: 0,
      risks,
      issues: risks.length ? risks : [raw],
      auditedAt: new Date().toISOString(),
    });
  }
}