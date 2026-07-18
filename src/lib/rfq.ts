import type { Audit, Company, PenaltyItem, PricingItem, Proposal } from "@/db/schema";
import { hashStr } from "./utils";

export const SEO_MARKET_ESTIMATE = {
  title: "برآورد بازار ارائه‌دهندگان سئو در ایران",
  note:
    "عدد رسمی و واحدی برای کل بازار سئو ایران منتشر نشده است؛ این تخمین عملیاتی برای مناقصه است و بر اساس مشاهده بازار، دایرکتوری‌ها، آژانس‌های دیجیتال مارکتینگ، فریلنسرها و تیم‌های محتوایی دسته‌بندی شده است.",
  segments: [
    { label: "آژانس‌های تاپ و شناخته‌شده", countMin: 30, countMax: 80, fit: "پروژه‌های بزرگ، قرارداد رسمی، بودجه بالا" },
    { label: "آژانس‌های فعال متوسط", countMin: 200, countMax: 500, fit: "بهترین گزینه برای استعلام رقابتی قیمت" },
    { label: "تیم‌های کوچک و بوتیک", countMin: 300, countMax: 800, fit: "انعطاف‌پذیر، مناسب صنعت‌های خاص" },
    { label: "فریلنسرهای سئو/محتوا", countMin: 1000, countMax: 3000, fit: "برای بخش‌هایی مثل محتوا، آن‌پیج و گزارش‌گیری" },
  ],
  recommendedInviteCount: 12,
  recommendedShortlistCount: 5,
};

export const SAMPLE_SEO_VENDORS = [
  { name: "آژانس رشدینو دیجیتال", tier: "top-agency", city: "تهران", specialties: ["سئو صنعتی", "رپورتاژ", "تکنیکال"], minProjectBudget: 90_000_000, score: 91 },
  { name: "استودیو سرچ‌گروث", tier: "agency", city: "تهران", specialties: ["B2B", "محتوا", "لینک‌سازی"], minProjectBudget: 55_000_000, score: 86 },
  { name: "تیم سئو پارس‌رنک", tier: "agency", city: "اصفهان", specialties: ["سئو محلی", "تکنیکال", "CRO"], minProjectBudget: 45_000_000, score: 82 },
  { name: "بوتیک مارکتینگ سپیدار", tier: "agency", city: "شیراز", specialties: ["صنایع ساختمانی", "محتوا", "گوگل مپ"], minProjectBudget: 38_000_000, score: 79 },
  { name: "گروه رتبه‌سازان نوین", tier: "agency", city: "تهران", specialties: ["رپورتاژ", "لینک‌سازی", "لید B2B"], minProjectBudget: 60_000_000, score: 84 },
  { name: "سئوکار مستقل الف", tier: "freelancer", city: "کرج", specialties: ["آن‌پیج", "محتوا", "گزارش"], minProjectBudget: 18_000_000, score: 73 },
  { name: "تیم محتوا و سئو آذر", tier: "freelancer", city: "تبریز", specialties: ["محتوا", "FAQ Schema", "لینک داخلی"], minProjectBudget: 15_000_000, score: 71 },
  { name: "آژانس تکنیکال‌سئو ایران", tier: "top-agency", city: "تهران", specialties: ["Core Web Vitals", "Next.js", "Schema"], minProjectBudget: 85_000_000, score: 89 },
  { name: "خانه سئو صنعتی", tier: "agency", city: "مشهد", specialties: ["صنعتی", "نمایشگاهی", "B2B"], minProjectBudget: 42_000_000, score: 81 },
  { name: "رتبه اول مارکتینگ", tier: "agency", city: "تهران", specialties: ["گوگل مپ", "رپورتاژ", "تحلیل رقبا"], minProjectBudget: 50_000_000, score: 83 },
  { name: "فریلنسر سئو تکنیکال ب", tier: "freelancer", city: "تهران", specialties: ["تکنیکال", "سرعت", "کنسول"], minProjectBudget: 20_000_000, score: 75 },
  { name: "استودیو لینک امن", tier: "agency", city: "تهران", specialties: ["لینک‌سازی سفید", "رپورتاژ صنعتی"], minProjectBudget: 65_000_000, score: 85 },
  { name: "آژانس لیدساز", tier: "agency", city: "رشت", specialties: ["CRO", "فرم تماس", "لید"], minProjectBudget: 35_000_000, score: 77 },
  { name: "تیم سئو پاک", tier: "agency", city: "تهران", specialties: ["وایت‌هت", "محتوا", "پایش رتبه"], minProjectBudget: 40_000_000, score: 80 },
];

function detectIndustry(name: string): string {
  if (/درب|پنجره|upvc|یوپی|پروفیل|آلومینیوم|شیشه|نما/i.test(name)) {
    return "صنعت درب، پنجره، پروفیل و مصالح ساختمانی";
  }
  if (/غذا|نوشیدنی|کشاورزی|دام/i.test(name)) return "صنایع غذایی و کشاورزی";
  if (/پزشک|درمان|دارو|آزمایش/i.test(name)) return "پزشکی و سلامت";
  return "صنعت B2B نمایشگاهی";
}

export function makeAlias(company: Pick<Company, "id" | "name">): string {
  const code = (hashStr(`${company.id}-${company.name}`) % 9000) + 1000;
  return `پروژه محرمانه SEO-${code}`;
}

export function buildAnonymousBrief({
  company,
  audit,
  proposal,
}: {
  company: Company;
  audit: Audit | null;
  proposal: Proposal;
}) {
  const alias = makeAlias(company);
  const packageScope = (proposal.pricing as PricingItem[]).map((p) =>
    `${p.title}: ${p.details} — بازه بودجه ${p.costMin.toLocaleString("fa-IR")} تا ${p.costMax.toLocaleString("fa-IR")} تومان`,
  );
  const prohibited = (proposal.penalties as PenaltyItem[]).map(
    (p) => `${p.title} ممنوع است؛ پیامد: ${p.consequence}`,
  );
  return {
    alias,
    confidentiality:
      "نام شرکت، دامنه، شماره تماس و هر نشانه قابل‌شناسایی تا قبل از پرداخت امانت/توافق پورسانت مخفی می‌ماند. ارائه‌دهنده فقط بر اساس ویژگی پروژه قیمت می‌دهد.",
    industry: detectIndustry(company.name),
    city: "ایران / اولویت تهران و شهرهای صنعتی",
    currentState: [
      company.onFirstPage === false
        ? `در صفحه اول گوگل دیده نمی‌شود (رتبه فعلی حدود ${company.googleRank ?? "نامشخص"})`
        : "وضعیت حضور در صفحه اول نیازمند پایش مجدد است",
      company.website ? "وب‌سایت دارد و نیاز به ممیزی/بهینه‌سازی دارد" : "وب‌سایت اختصاصی قابل اتکا ندارد یا معرفی نشده است",
      audit ? `امتیاز سلامت سئو: ${audit.score} از ۱۰۰` : "ممیزی فنی هنوز کامل نشده است",
      ...(audit?.issues.slice(0, 5) ?? []),
    ],
    goals: [
      "رسیدن به تاپ ۱۰ گوگل برای کلمات پول‌ساز صنعت در ۳ تا ۶ ماه",
      "افزایش تماس ورودی از گوگل و تبدیل لید نمایشگاهی به فروش",
      "اجرای کاملاً وایت‌هت، بدون PBN، اسپم یا ریسک پنالتی گوگل",
      "گزارش هفتگی رتبه، ترافیک، اقدامات و هزینه‌های لینک/رپورتاژ",
    ],
    packageScope,
    prohibited,
    discloseAfter:
      "پس از پذیرش قیمت، پرداخت امانت یا ثبت پورسانت، اطلاعات واقعی شرکت، دامنه، شماره تماس و فایل ممیزی کامل برای مجری منتخب باز می‌شود.",
  };
}

export function simulateVendorQuote({
  vendorScore,
  totalMin,
  totalMax,
  seed,
}: {
  vendorScore: number;
  totalMin: number;
  totalMax: number;
  seed: string;
}) {
  const h = hashStr(seed);
  const premium = vendorScore >= 88 ? 1.22 : vendorScore >= 82 ? 1.08 : vendorScore < 75 ? 0.82 : 0.95;
  const noise = 0.9 + ((h % 21) / 100);
  const priceMin = Math.round((totalMin * premium * noise) / 500_000) * 500_000;
  const priceMax = Math.round((totalMax * premium * (noise + 0.04)) / 500_000) * 500_000;
  const durationWeeks = 12 + (h % 10);
  return { priceMin, priceMax, durationWeeks };
}
