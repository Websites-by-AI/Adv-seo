const MAX_HTML_BYTES = 1_000_000;
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

async function safeFetch(rawUrl) {
  let current = String(rawUrl);
  let hops = 0;
  for (let redirect = 0; redirect <= 4; redirect += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": "LeadfarBot/1.0" },
    });
    if (REDIRECT_CODES.has(response.status) && response.headers.get("location")) {
      current = new URL(response.headers.get("location"), current).toString();
      hops++;
      continue;
    }
    return { response, finalUrl: current, hops };
  }
  throw new Error("Too many redirects");
}

export async function onRequestGet({ request }) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return new Response(JSON.stringify({ error: "URL required" }), { status: 400 });

  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const { response, finalUrl, hops } = await safeFetch(normalized);
    const html = await response.text();
    
    // Basic SEO Logic
    const hasHttps = finalUrl.startsWith("https");
    const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || "";
    const h1 = html.match(/<h1.*?>(.*?)<\/h1>/i)?.[1] || "";

    const risks = [];
    if (!hasHttps) risks.push("عدم وجود پروتکل امن HTTPS");
    if (hops > 2) risks.push("زنجیره تغییر مسیر طولانی");

    return new Response(JSON.stringify({
      score: title && h1 ? 85 : 40,
      title,
      h1,
      https: hasHttps,
      risks,
      mode: "live"
    }));
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
