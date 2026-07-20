export async function onRequestGet({ request }) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) return new Response(JSON.stringify({ results: [] }), { status: 400 });

  // Use DuckDuckGo HTML as a free reliable source
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const html = await response.text();
    const results = [];
    
    // Simple regex to extract organic results from DDG HTML
    const regex = /<a class="result__a" href="(.*?)">(.*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null && results.length < 15) {
      let rawUrl = match[1];
      if (rawUrl.includes("uddg=")) {
         rawUrl = decodeURIComponent(rawUrl.split("uddg=")[1].split("&")[0]);
      }
      if (rawUrl.startsWith("http")) {
        results.push({
          url: rawUrl,
          title: match[2].replace(/<[^>]*>?/gm, ''),
          host: new URL(rawUrl).hostname,
          source: "DuckDuckGo"
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
