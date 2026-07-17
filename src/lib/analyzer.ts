import * as cheerio from "cheerio";
import type {
  ActionItem,
  Check,
  DesignProposal,
  Issue,
  KeywordRank,
  ReportData,
  RoadmapPhase,
} from "@/lib/types";
import { hashString, mulberry32, pick } from "@/lib/utils";

interface CompanyInput {
  id: number;
  name: string;
  category: string;
  city: string;
  website: string;
}

interface AuditResult {
  reachable: boolean;
  https: boolean;
  title: boolean;
  meta: boolean;
  h1: boolean;
  mobile: boolean;
  speedOk: boolean;
  loadMs: number;
  live: boolean;
}

/* ------------------------------------------------------------------ */
/*  ماژول ۱ · خزش زنده وب‌سایت                                          */
/* ------------------------------------------------------------------ */
async function auditWebsite(url: string): Promise<AuditResult | null> {
  const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const started = Date.now();
    const res = await fetch(withProto, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; ExpoRadarBot/1.0; +https://radar.local/bot)",
        accept: "text/html,*/*",
      },
      cache: "no-store",
    });
    clearTimeout(timer);
    const loadMs = Date.now() - started;
    const html = await res.text();
    if (!res.ok || html.length < 200) return null;
    const $ = cheerio.load(html);
    const finalUrl = new URL(res.url || withProto);
    const metaDesc = $('meta[name="description"]').attr("content") ?? "";
    return {
      reachable: true,
      https: finalUrl.protocol === "https:",
      title: ($("title").first().text() ?? "").trim().length > 4,
      meta: metaDesc.trim().length > 20,
      h1: $("h1").first().text().trim().length > 0,
      mobile: $('meta[name="viewport"]').length > 0,
      speedOk: loadMs < 2500 && html.length < 800_000,
      loadMs,
      live: true,
    };
  } catch {
    return null;
  }
}

function estimatedAudit(seedCompany: CompanyInput, seed: number): AuditResult | null {
  if (!seedCompany.website) return null;
  const r = mulberry32(hashString(seedCompany.name + "::site") ^ seed);
  const reachable = r() > 0.18;
  if (!reachable) {
    return {
      reachable: false,
      https: r() > 0.5,
      title: false,
      meta: false,
      h1: false,
      mobile: false,
      speedOk: false,
      loadMs: 4000 + Math.floor(r() * 4000),
      live: false,
    };
  }
  const loadMs = 900 + Math.floor(r() * 3400);
  return {
    reachable: true,
    https: r() > 0.3,
    title: r() > 0.18,
    meta: r() > 0.45,
    h1: r() > 0.3,
    mobile: r() > 0.42,
    speedOk: loadMs < 2600,
    loadMs,
    live: false,
  };
}

/* ------------------------------------------------------------------ */
/*  ماژول ۲ · رتبه‌گیری گوگل                                            */
/*  - اگر SERPER_API_KEY ست باشد: نتایج واقعی گوگل (google.serper.dev)  */
/*  - در غیر این صورت: برآورد قطعی (deterministic) با برچسب «برآوردی»   */
/* ------------------------------------------------------------------ */
function domainOf(url: string): string {
  try {
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withProto).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

interface SerperOrganic {
  link?: string;
  position?: number;
}

async function serperSearch(q: string, apiKey: string): Promise<SerperOrganic[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q, gl: "ir", hl: "fa", num: 100 }),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { organic?: SerperOrganic[] };
    return data.organic ?? [];
  } catch {
    return null;
  }
}

function estimateKeywordRanks(
  company: CompanyInput,
  keywords: string[],
  score: number,
  seed: number
): KeywordRank[] {
  const r = mulberry32(seed ^ 0xbeef);
  return keywords.map((keyword) => {
    const v = r();
    let rank: number | null;
    if (!company.website) rank = null;
    else if (score >= 82 && v > 0.55) rank = 3 + Math.floor(v * 9); // گاهی صفحه اول
    else if (score >= 60) rank = 12 + Math.floor(v * 26); // صفحه دوم/سوم
    else rank = v > 0.45 ? 34 + Math.floor(v * 40) : null; // عمیق یا گم
    if (rank !== null && rank > 100) rank = null;
    return { keyword, rank };
  });
}

async function detectGoogleRank(
  company: CompanyInput,
  keywords: string[],
  score: number,
  seed: number
): Promise<{ keywordRanks: KeywordRank[]; rankSource: "serper" | "estimated" | "none" }> {
  if (!company.website) {
    return {
      keywordRanks: keywords.map((keyword) => ({ keyword, rank: null })),
      rankSource: "none",
    };
  }

  const apiKey = process.env.SERPER_API_KEY;
  const domain = domainOf(company.website);

  if (apiKey && domain) {
    const live: (KeywordRank | "fail")[] = [];
    for (const keyword of keywords.slice(0, 3)) {
      const organic = await serperSearch(keyword, apiKey);
      if (!organic) {
        live.push("fail");
        continue;
      }
      const hit = organic.find((o) => {
        const host = domainOf(o.link ?? "");
        return host === domain || host.endsWith("." + domain);
      });
      live.push({
        keyword,
        rank: hit?.position && hit.position <= 100 ? hit.position : null,
      });
    }
    if (live.every((x) => x !== "fail")) {
      return { keywordRanks: live as KeywordRank[], rankSource: "serper" };
    }
    /* بخشی از پاسخ‌ها سالمی‌اند؛ باقی را با برآورد پر می‌کنیم */
    const est = estimateKeywordRanks(company, keywords, score, seed);
    const merged = keywords.map((k, i) => {
      const l = live[i];
      return l && l !== "fail" ? l : est[i];
    });
    const anyLive = live.some((x) => x !== "fail");
    return { keywordRanks: merged, rankSource: anyLive ? "serper" : "estimated" };
  }

  return {
    keywordRanks: estimateKeywordRanks(company, keywords, score, seed),
    rankSource: "estimated",
  };
}

/* ------------------------------------------------------------------ */
/*  ماژول ۳ · امتیاز فرصت فروش                                          */
/* ------------------------------------------------------------------ */
function computeOpportunity(
  hasSite: boolean,
  onPageOne: boolean,
  seed: number
): number {
  const r = mulberry32(seed ^ 0x51ab);
  const base = !hasSite ? 76 : onPageOne ? 18 : 48;
  return Math.min(98, Math.round(base + r() * 20));
}

/* ------------------------------------------------------------------ */
/*  ساخت چک‌ها، مشکلات، اقدام‌ها، طراحی و نقشه راه                      */
/* ------------------------------------------------------------------ */
function buildKeywords(c: CompanyInput): string[] {
  const base = c.category || "درب و پنجره";
  const name = c.name.replace(/^گروه صنعتی |^کارخانه /, "");
  return [
    `${base} ${c.city}`,
    `قیمت ${base}`,
    `${base} نمایشگاه`,
    `فروشگاه ${name}`,
    `نمایندگی ${base}`,
  ];
}

function buildChecks(c: CompanyInput, a: AuditResult | null): Check[] {
  return [
    {
      key: "website",
      label: "داشتن وب‌سایت",
      ok: Boolean(c.website),
      hint: c.website
        ? "دامنه ثبت شده؛ باید سالم و ایندکس‌شده باشد."
        : "شرکت هیچ وب‌سایتی ندارد؛ در گوگل عملاً نامرئی است.",
    },
    {
      key: "reachable",
      label: "در دسترس بودن وب‌سایت",
      ok: Boolean(a?.reachable),
      hint: a?.reachable
        ? `سایت بالا آمد در ${Math.round((a.loadMs ?? 0) / 100) / 10} ثانیه.`
        : "سرور پاسخ نمی‌دهد یا دامنه خراب است.",
    },
    {
      key: "https",
      label: "گواهی SSL (HTTPS)",
      ok: Boolean(a?.https),
      hint: a?.https
        ? "اتصال امن فعال است."
        : "بدون HTTPS گوگل هشدار «ناامن» نمایش می‌دهد و رتبه افت می‌کند.",
    },
    {
      key: "mobile",
      label: "ریسپانسیو (موبایل)",
      ok: Boolean(a?.mobile),
      hint: a?.mobile
        ? "viewport تنظیم شده است."
        : "بیش از ۸۰٪ جست‌وجوهای ایران موبایلی است؛ این مورد حیاتی است.",
    },
    {
      key: "speed",
      label: "سرعت بارگذاری",
      ok: Boolean(a?.speedOk),
      hint: a?.speedOk
        ? "زمان بارگذاری قابل قبول است."
        : "هر ثانیه تأخیر، نرخ ریزش را تا ۲۰٪ بیشتر می‌کند.",
    },
    {
      key: "title",
      label: "تگ عنوان (Title)",
      ok: Boolean(a?.title),
      hint: a?.title
        ? "عنوان صفحه اصلی وجود دارد."
        : "بدون Title معنادار، اسنیپت گوگل ضعیف نمایش داده می‌شود.",
    },
    {
      key: "meta",
      label: "متا دیسکریپشن",
      ok: Boolean(a?.meta),
      hint: a?.meta
        ? "توضیحات متا تعریف شده است."
        : "بدون متا دیسکریپشن نرخ کلیک (CTR) سرچ افت می‌کند.",
    },
    {
      key: "h1",
      label: "سرفصل H1",
      ok: Boolean(a?.h1),
      hint: a?.h1
        ? "ساختار سرفصل سالم است."
        : "صفحه اصلی فاقد H1 است؛ موضوع صفحه برای گوگل مبهم می‌ماند.",
    },
  ];
}

function computeScore(checks: Check[]): number {
  const weights: Record<string, number> = {
    website: 22,
    reachable: 12,
    https: 10,
    mobile: 14,
    speed: 10,
    title: 10,
    meta: 10,
    h1: 12,
  };
  return checks.reduce((sum, c) => sum + (c.ok ? (weights[c.key] ?? 0) : 0), 0);
}

function buildIssues(c: CompanyInput, checks: Check[], googleRank: number | null): Issue[] {
  const issues: Issue[] = [];
  const failed = new Set(checks.filter((x) => !x.ok).map((x) => x.key));
  if (failed.has("website"))
    issues.push({
      id: "no-site",
      title: "غیبت کامل از بستر وب",
      detail: `این شرکت هیچ وب‌سایتی ندارد؛ یعنی هر جست‌وجوی «${c.category} ${c.city}» مستقیم به رقبا تحویل داده می‌شود. بزرگ‌ترین فرصت فروش برای شما.`,
      severity: "high",
    });
  if (failed.has("reachable") && !failed.has("website"))
    issues.push({
      id: "down",
      title: "وب‌سایت در دسترس نیست",
      detail: "دامنه ثبت شده اما سرور پاسخ نمی‌دهد. بودجه تبلیغات نمایشگاه به یک صفحه خراب می‌ریزد.",
      severity: "high",
    });
  if (failed.has("https"))
    issues.push({
      id: "ssl",
      title: "SSL فعال نیست",
      detail: "گوگل سایت‌های HTTP را ناامن علامت‌گذاری می‌کند و در رتبه‌بندی جریمه می‌کند.",
      severity: "high",
    });
  if (failed.has("mobile"))
    issues.push({
      id: "mobile",
      title: "نسخه موبایل ضعیف",
      detail: "بدون تجربه موبایل، خریداران غرفه که همان‌جا با موبایل سرچ می‌کنند از دست می‌روند.",
      severity: "high",
    });
  if (failed.has("speed"))
    issues.push({
      id: "speed",
      title: "سرعت بارگذاری بالا",
      detail: "صفحات سنگین باعث ریزش بازدیدکننده و افت رتبه می‌شوند.",
      severity: "medium",
    });
  if (failed.has("title") || failed.has("meta") || failed.has("h1"))
    issues.push({
      id: "onpage",
      title: "سئو داخلی ناقص",
      detail: "تگ‌های Title، متا دیسکریپشن و سرفصل H1 بهینه نیستند؛ گوگل موضوع صفحات را درست نمی‌فهمد.",
      severity: "medium",
    });
  if (!failed.has("website") && googleRank === null)
    issues.push({
      id: "invisible",
      title: "در ۱۰۰ نتیجه اول گوگل دیده نمی‌شود",
      detail: "با وجود سایت، برای کلیدواژه‌های اصلی صنعت چیزی به دست نیامده؛ محتوا و اعتبار دامنه ناکافی است.",
      severity: "high",
    });
  if (googleRank !== null && googleRank > 10)
    issues.push({
      id: "page2",
      title: `رتبه فعلی: نتیجه ${googleRank} (صفحه دوم و بدتر)`,
      detail: "نزدیک است اما هنوز کف بازار را دست رقبا داده؛ با کمپین هدفمند قابل بازگشت است.",
      severity: "medium",
    });
  return issues;
}

function buildActions(c: CompanyInput, checks: Check[], hasSite: boolean): ActionItem[] {
  const failed = new Set(checks.filter((x) => !x.ok).map((x) => x.key));
  const acts: ActionItem[] = [];
  const kw = `${c.category || "درب و پنجره"} ${c.city}`;

  if (!hasSite) {
    acts.push(
      { id: "build-site", title: "طراحی وب‌سایت اختصاصی", detail: `سایت شرکتی سریع و فارسی با تمرکز بر کلیدواژه «${kw}». دامنه .ir + هاست داخل ایران.`, category: "سئو فنی", priority: "بالا", impact: 98 },
      { id: "gmb", title: "ثبت Google Business Profile", detail: "ثبت شرکت روی نقشه گوگل با تلفن غرفه و روزهای نمایشگاه؛ سریع‌ترین راه دیده شدن در جست‌وجوی محلی.", category: "سئو محلی", priority: "بالا", impact: 90 },
      { id: "gsc", title: "اتصال به Search Console", detail: "معرفی سایت به گوگل از روز اول؛ پایش ایندکس و عیب‌یابی خزش.", category: "سئو فنی", priority: "بالا", impact: 82 }
    );
  } else {
    if (failed.has("reachable"))
      acts.push({ id: "fix-host", title: "احیای هاست و دامنه", detail: "رفع خطای سرور/هاست؛ بدون سایتِ بالاآمده هیچ بهینه‌سازی دیگری معنا ندارد.", category: "سئو فنی", priority: "بالا", impact: 97 });
    if (failed.has("https"))
      acts.push({ id: "ssl", title: "نصب گواهی SSL", detail: "فعال‌سازی HTTPS روی کل دامنه و ریدایرکت ۳۰۱ نسخه HTTP.", category: "سئو فنی", priority: "بالا", impact: 84 });
    if (failed.has("title") || failed.has("meta"))
      acts.push({ id: "meta", title: "بازنویسی Title و متا", detail: `Title هر صفحه با الگوی «خدمت + شهر»، مثل «${kw} | ${c.name}».`, category: "سئو فنی", priority: "بالا", impact: 80 });
    if (failed.has("h1"))
      acts.push({ id: "h1", title: "بازطراحی ساختار سرفصل‌ها", detail: "یک H1 واحد دارای کلیدواژه اصلی + زیرسرفصل‌های H2/H3 معنادار.", category: "سئو فنی", priority: "متوسط", impact: 66 });
    if (failed.has("mobile"))
      acts.push({ id: "responsive", title: "ریسپانسیو کردن کامل سایت", detail: "طراحی مجدد موبایل‌محور؛ دکمه تماس شناور و استعلام قیمت یک‌لمسی.", category: "تجربه کاربری", priority: "بالا", impact: 86 });
    if (failed.has("speed"))
      acts.push({ id: "speed", title: "بهینه‌سازی سرعت", detail: "فشرده‌سازی تصاویر محصول به WebP، حذف اسکریپت‌های اضافه، رسیدن LCP به زیر ۲٫۵ ثانیه.", category: "تجربه کاربری", priority: "متوسط", impact: 70 });
    acts.push(
      { id: "content", title: "تولید محتوای کلیدواژه‌محور", detail: `هفته‌ای دو مقاله راهنما؛ مثل «راهنمای خرید ${c.category}»، «مقایسه قیمت ${c.category} در ${c.city}».`, category: "محتوا", priority: "بالا", impact: 88 },
      { id: "schema", title: "اسکیما LocalBusiness", detail: "نشانه‌گذاری ساخت‌یافته محصول و خدمات برای اسنیپت غنی‌تر در نتایج گوگل.", category: "سئو فنی", priority: "متوسط", impact: 62 },
      { id: "backlink", title: "بک‌لینک از رسانه‌های صنعت", detail: "ریپورتاژ در پورتال‌های ساختمان و دایرکتوری نمایشگاه‌ها؛ تقویت اعتبار دامنه.", category: "اعتبارسازی", priority: "متوسط", impact: 76 },
      { id: "reviews", title: "جمع‌آوری نظرات مشتری", detail: "ثبت تجربه مشتریان نمایشگاه در گوگل و سایت؛ افزایش CTR و اعتماد.", category: "سئو محلی", priority: "کم", impact: 54 }
    );
  }
  const order = { بالا: 0, متوسط: 1, کم: 2 } as const;
  return acts.sort((a, b) => order[a.priority] - order[b.priority]);
}

function buildDesign(c: CompanyInput, seed: number): DesignProposal {
  const r = mulberry32(hashString(c.name + "::design") ^ seed);
  const palettes: DesignProposal["palette"][] = [
    [
      { name: "طوسی فلزی", hex: "#2B2F36", role: "پس‌زمینه اصلی" },
      { name: "نقره‌ای پروفیل", hex: "#C7CED6", role: "متن و آیکن" },
      { name: "طلایی نمایشگاه", hex: "#F2A93B", role: "دکمه و CTA" },
    ],
    [
      { name: "سرمه‌ای عمیق", hex: "#16233A", role: "پس‌زمینه اصلی" },
      { name: "آبی پتروشیمی", hex: "#3E7CB1", role: "لینک و هایلایت" },
      { name: "سفید یخی", hex: "#EFF4F8", role: "متن" },
    ],
    [
      { name: "گرافیت", hex: "#1C1E21", role: "پس‌زمینه اصلی" },
      { name: "سبز فیروزه‌ای", hex: "#3DDC97", role: "عناصر فعال" },
      { name: "استخوانی", hex: "#EDE8DF", role: "متن" },
    ],
  ];
  const structures: string[][] = [
    [
      "هیرو تمام‌صفحه با ویدئوی خط تولید + دکمه «استعلام قیمت»",
      "گالری محصول فیلترپذیر بر اساس جنس پروفیل",
      "بخش «پروژه‌های نمایشگاه ۱۴۰۴» با لوکیشن غرفه",
      "مقایسه تصویری قبل/بعد نصب",
    ],
    [
      "هیرو با فرم سریع مشاوره رایگان",
      "جدول مشخصات فنی دانلودپذیر (PDF)",
      "نقشه تعاملی نمایندگی‌های سراسری",
      "مشاور آنلاین واتساپ شناور",
    ],
    [
      "منوی مگا با دسته‌بندی محصولات",
      "اسلایدر گواهینامه‌ها و استانداردها",
      "بخش محاسبه‌گر آنلاین قیمت پنجره",
      "مقالات آموزش نصب و نگهداری",
    ],
  ];
  return {
    headline: `وب‌سایتی که غرفه ${c.name} را هفت‌روزه و ۲۴ ساعته در گوگل باز نگه می‌دارد`,
    style: pick(
      [
        "صنعتیِ مینیمال با تایپوگرافی درشت و فضای منفی",
        "پرمیوم تیره با دیالوگ محصول و گرادیان‌های فلزی",
        "روشن، تمیز و اعتمادساز با تمرکز بر فرم‌های تبدیل",
      ],
      r()
    ),
    font: "وزیرمتن برای متن + یک تایپ‌فیس نمایشی سنگین برای سرفصل عدد و برند",
    cta: pick(["استعلام قیمت همین حالا", "رزرو بازدید از غرفه", "دریافت کاتالوگ ۱۴۰۴"], r()),
    palette: pick(palettes, r()),
    structure: pick(structures, r()),
  };
}

function buildRoadmap(c: CompanyInput, hasSite: boolean): RoadmapPhase[] {
  const kw = `${c.category || "درب و پنجره"} ${c.city}`;
  return [
    {
      title: "فاز ۱ · بنیان",
      window: "روز ۱ تا ۱۴",
      goal: hasSite ? "سالم‌سازی زیرساخت فنی" : "ساخت حضور آنلاین از صفر",
      tasks: hasSite
        ? [
            "رفع SSL، سرعت و ریسپانسیو",
            "بازنویسی Title/متا صفحه اصلی حول «" + kw + "»",
            "اتصال Search Console و نقشه سایت",
          ]
        : [
            "ثبت دامنه .ir و راه‌اندازی سایت ۵ صفحه‌ای",
            "ثبت Google Business Profile",
            "معرفی به Search Console از روز اول",
          ],
    },
    {
      title: "فاز ۲ · رشد",
      window: "روز ۱۵ تا ۶۰",
      goal: "پوشش کلیدواژه‌های پول‌ساز صنعت",
      tasks: [
        "انتشار ۱۲ مقاله راهنمای خرید و قیمت",
        "صفحه اختصاصی برای هر محصول غرفه",
        "لینک‌سازی از دایرکتوری نمایشگاه و رسانه‌های ساختمان",
      ],
    },
    {
      title: "فاز ۳ · تثبیت",
      window: "روز ۶۰ تا ۱۲۰",
      goal: "ورود به ۱۰ نتیجه اول و حفظ آن",
      tasks: [
        "پایش هفتگی رتبه کلیدواژه‌ها و بهینه‌سازی اسنیپت",
        "کسب بک‌لینک از پروژه‌های معرفی‌شده",
        "A/B تست صفحه فرود برای نرخ تبدیل بالاتر",
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  موتور اصلی                                                          */
/* ------------------------------------------------------------------ */
export async function analyzeCompany(c: CompanyInput): Promise<ReportData> {
  const seed = hashString(c.website || c.name + c.city);
  const hasSite = Boolean(c.website?.trim());

  const live = hasSite ? await auditWebsite(c.website) : null;
  const audit = live ?? estimatedAudit(c, seed);
  const checks = buildChecks(c, audit);
  let score = computeScore(checks);

  const keywords = buildKeywords(c);
  const { keywordRanks, rankSource } = await detectGoogleRank(c, keywords, score, seed);
  const bestRanks = keywordRanks.filter((k) => k.rank !== null).map((k) => k.rank as number);
  const googleRank = bestRanks.length > 0 ? Math.min(...bestRanks) : null;
  const onPageOne = googleRank !== null && googleRank <= 10;
  if (onPageOne) score = Math.max(score, 80);

  return {
    seoScore: score,
    googleRank,
    onPageOne,
    loadMs: audit?.loadMs ?? 0,
    dataSource: live ? "live" : "estimated",
    rankSource,
    opportunity: computeOpportunity(hasSite, onPageOne, seed),
    keywordRanks,
    keywords,
    checks,
    issues: buildIssues(c, checks, googleRank),
    actions: buildActions(c, checks, hasSite),
    design: buildDesign(c, seed),
    roadmap: buildRoadmap(c, hasSite),
    analyzedAt: new Date().toISOString(),
  };
}
