import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ParsedCompany {
  name: string;
  phone: string;
  website: string;
}

const FA = "۰۱۲۳۴۵۶۷۸۹";
function toLatinDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => {
    const i = FA.indexOf(d);
    return i >= 0 ? String(i) : String("٠١٢٣٤٥٦٧٨٩".indexOf(d) % 10);
  });
}

const PHONE_RE = /0\d[\d\s\-–]{7,11}\d/g;
const DOMAIN_RE = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]*\.(?:ir|com|co|net|org|me|io)(?:\/[^\s«»،]*)?)/i;
const PERSIAN_RE = /[؀-ۿ]/;

function cleanName(raw: string): string {
  return toLatinDigits(raw)
    .replace(PHONE_RE, " ")
    .replace(DOMAIN_RE, " ")
    .replace(/[«»()\[\]|:؛،,.·•◦]+/g, " ")
    .replace(/[-–—_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* کلید نرمال‌شده برای تشخیص تکراری‌ها: کلمات رایج سازمانی حذف می‌شود */
function dedupeKey(name: string): string {
  return name
    .replace(/^(شرکت|گروه|کارخانه|صنایع|صنعتی|تولیدی)\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidName(name: string): boolean {
  return name.length >= 4 && name.length <= 64 && PERSIAN_RE.test(name) && !/صفحه|ورود|ثبت|تماس با ما|درباره|خانه|منو|جستجو|نمایشگاه بین/.test(name);
}

function extractFromLine(line: string): ParsedCompany | null {
  const latin = toLatinDigits(line);
  const phone = (latin.match(PHONE_RE)?.[0] ?? "").replace(/[\s+]/g, "");
  const siteMatch = latin.match(DOMAIN_RE);
  const website = siteMatch ? `https://${siteMatch[1].replace(/\/$/, "")}` : "";
  const name = cleanName(line);
  if (!isValidName(name)) return null;
  return { name, phone, website };
}

function parseText(text: string): ParsedCompany[] {
  const seen = new Set<string>();
  const out: ParsedCompany[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length < 4 || line.length > 140) continue;
    const parsed = extractFromLine(line);
    if (parsed) {
      const key = dedupeKey(parsed.name);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(parsed);
    }
    if (out.length >= 80) break;
  }
  return out;
}

async function fetchWithTimeout(url: string, ms: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        accept: "text/html,*/*",
      },
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

async function parseUrl(url: string): Promise<ParsedCompany[]> {
  const html = await fetchWithTimeout(url, 7000);
  if (!html) return [];
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const out: ParsedCompany[] = [];

  /* الگوهای رایج دایرکتوری‌های وردپرسی مثل iranadfair (adforest) و مشابه آن */
  const selectors = [
    ".paper-back h4 a",
    ".ad-title a",
    "[class*='listing'] [class*='title'] a",
    "[class*='company'] [class*='name'], [class*='Company'] [class*='Name']",
    "h2 a, h3 a, h4 a",
    "article a[rel='bookmark']",
  ];

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const name = cleanName($(el).text());
      const key = dedupeKey(name);
      if (!isValidName(name) || seen.has(key)) return;
      const card = $(el).closest("div, li, article, tr");
      const cardText = toLatinDigits(card.text().slice(0, 600));
      const phone = (cardText.match(PHONE_RE)?.[0] ?? "").replace(/\s+/g, "");
      const siteLink = card
        .find("a[href*='http']")
        .toArray()
        .map((a) => $(a).attr("href") ?? "")
        .find((h) => {
          try {
            return new URL(h).hostname !== new URL(url).hostname;
          } catch {
            return false;
          }
        });
      seen.add(key);
      out.push({ name, phone, website: siteLink ?? "" });
      if (out.length >= 80) return false;
    });
    if (out.length >= 6) break; // اولین سلکتوری که نتیجه معنادار داد کافی است
  }
  return out.slice(0, 80);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      mode?: "text" | "url";
      text?: string;
      url?: string;
      exhibition?: string;
      city?: string;
    };

    let parsed: ParsedCompany[] = [];
    if (body.mode === "url" && body.url?.trim()) {
      parsed = await parseUrl(body.url.trim());
    } else if (body.mode === "text" && body.text?.trim()) {
      parsed = parseText(body.text);
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        {
          inserted: 0,
          skipped: 0,
          total: 0,
          error:
            body.mode === "url"
              ? "از این صفحه شرکتی استخراج نشد؛ صفحه ممکن است از خزش جلوگیری کند. حالت «جای‌گذاری متن» را امتحان کنید و لیست را از صفحه کپی کنید."
              : "سطر معتبری پیدا نشد؛ هر سطر باید نام یک شرکت فارسی باشد.",
        },
        { status: 422 }
      );
    }

    const names = parsed.map((p) => p.name);
    const existing = await db
      .select({ name: companies.name })
      .from(companies)
      .where(inArray(companies.name, names));
    const existingNames = new Set(existing.map((e) => e.name));

    const toInsert = parsed.filter((p) => !existingNames.has(p.name));
    const exhibition = body.exhibition?.trim() || "نمایشگاه (وارد شده دستی)";
    const city = body.city?.trim() || "نامشخص";

    if (toInsert.length > 0) {
      await db.insert(companies).values(
        toInsert.map((p) => ({
          name: p.name,
          category: "",
          exhibition,
          city,
          booth: "",
          phone: p.phone,
          website: p.website,
          status: "pending",
          stage: "new",
        }))
      );
    }

    return NextResponse.json({
      inserted: toInsert.length,
      skipped: parsed.length - toInsert.length,
      total: parsed.length,
      preview: toInsert.slice(0, 8).map((p) => p.name),
      exhibition,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطا در پردازش ورود اطلاعات" },
      { status: 500 }
    );
  }
}
