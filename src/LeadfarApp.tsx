import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import {
  Activity,
  ArrowLeft,
  Banknote,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  CircleX,
  ClipboardCheck,
  Clock3,
  Copy,
  Crosshair,
  Download,
  FileCheck2,
  FileInput,
  Gauge,
  Globe2,
  Camera,
  Import,
  Key,
  Link2,
  ListChecks,
  LoaderCircle,
  Mail,
  Megaphone,
  Menu,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  Phone,
  PlayCircle,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Target,
  Telescope,
  Timer,
  TrendingUp,
  Upload,
  Users,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View = "landing" | "dashboard" | "bids" | "compare" | "settings";
type FilterKey = "all" | "p1" | "p2" | "p3" | "leads" | "first-page" | "no-site" | "proposals";
type AuditMode = "live" | "estimated" | "no-site";
type Channel = "whatsapp" | "telegram" | "bale" | "rubika" | "soroush" | "eitaa" | "divar-chat" | "email" | "sms" | "divar";

type SendLogEntry = {
  id: number;
  channel: Channel;
  leadName: string;
  recipientHash: string;
  status: "queued" | "dry-run" | "sent" | "manual" | "failed";
  at: string;
  detail?: string;
};

type IntegrationStatus = {
  channel: Channel;
  ok: boolean;
  label: string;
  note: string;
};

type SiteAudit = {
  url: string;
  finalUrl: string;
  status: number;
  score: number;
  mode: "live" | "demo";
  title: string;
  metaDescription: string;
  h1: string;
  canonical: boolean;
  schema: boolean;
  internalLinks: number;
  robots: boolean;
  sitemap: boolean;
  https: boolean;
  phoneSignal: boolean;
  redirectHops?: number;
  risks?: string[];
  issues: string[];
  auditedAt: string;
};

type Lead = {
  id: number;
  name: string;
  sector: string;
  website: string | null;
  phone: string | null;
  googleRank: number | null;
  score: number | null;
  onFirstPage: boolean | null;
  issues: string[];
  proposalReady: boolean;
  auditMode: AuditMode | null;
  siteAudit?: SiteAudit;
};

type LogEntry = {
  id: number;
  message: string;
  time: string;
  tone: "good" | "info" | "warn";
};

type ImportedCompany = Pick<Lead, "name" | "website" | "phone">;

type PhoneType = "mobile" | "landline" | "whatsapp" | "international" | "unknown";
type DiscoveredPhone = {
  e164: string;
  display: string;
  type: PhoneType;
  operator?: string | null;
  country?: string | null;
  sources: string[];
  pages: string[];
};

type WhatsAppTarget = "auto" | "web" | "desktop" | "mobile";

type AgencyProfile = {
  name: string;
  website: string;
  phone: string;
  address: string;
  hours: string;
  logoDataUrl: string | null;
  intro: string;
};

const DEFAULT_AGENCY: AgencyProfile = {
  name: "سئوف (SEOF)",
  website: "https://seof.ir",
  phone: "021-66902605",
  address: "تهران، میدان انقلاب، خیابان آزادی، خیابان جمالزاده جنوبی، کوچه آقا صبوری",
  hours: "شنبه تا چهارشنبه، ۹:۳۰ صبح تا ۱۷:۳۰ عصر",
  logoDataUrl: "/seof-logo.png",
  intro:
    "سئوف، آژانس تخصصی سئو و رشد ارگانیک با تمرکز بر کسب‌وکارهای ایرانی. ما در کنار شما هستیم تا رتبه گوگل، اعتبار برند و ورودی باکیفیت وب‌سایتتان را افزایش دهیم.",
};

const seedCompetitors: Lead[] = [
  {
    id: 101,
    name: "آژانس سئو نوین‌رنک",
    sector: "آژانس سئو",
    website: "https://novinrank.ir",
    phone: "021-88451122",
    googleRank: 3,
    score: 92,
    onFirstPage: true,
    issues: ["نمونه‌کار در صفحه اصلی محدود است"],
    proposalReady: false,
    auditMode: "live",
  },
  {
    id: 102,
    name: "استودیو دیجیتال ورا",
    sector: "آژانس سئو",
    website: "https://vera-digital.com",
    phone: "021-77330099",
    googleRank: 5,
    score: 84,
    onFirstPage: true,
    issues: ["Schema سازمانی ثبت نشده"],
    proposalReady: false,
    auditMode: "live",
  },
  {
    id: 103,
    name: "گروه بازاریابی سیمرغ",
    sector: "آژانس سئو",
    website: "https://simorghmarketing.ir",
    phone: "021-22990033",
    googleRank: 12,
    score: 68,
    onFirstPage: false,
    issues: ["محتوای بلاگ به‌روز نیست", "سرعت صفحه اصلی پایین است"],
    proposalReady: true,
    auditMode: "estimated",
  },
];

const seedLeads: Lead[] = [
  {
    id: 1,
    name: "آرمان پنجره ایرانیان",
    sector: "درب و پنجره",
    website: "https://armanwindow.ir",
    phone: "021-88241036",
    googleRank: 24,
    score: 58,
    onFirstPage: false,
    issues: ["عنوان صفحات بهینه نیست", "سرعت موبایل پایین", "محتوای خدمات کم است"],
    proposalReady: true,
    auditMode: "live",
  },
  {
    id: 2,
    name: "صنایع آلومینیوم پارس",
    sector: "پروفیل آلومینیوم",
    website: "https://pars-alum.com",
    phone: "021-66191420",
    googleRank: 7,
    score: 81,
    onFirstPage: true,
    issues: ["اسکیما کامل نیست"],
    proposalReady: false,
    auditMode: "live",
  },
  {
    id: 3,
    name: "گروه صنعتی وین‌تک",
    sector: "پنجره UPVC",
    website: "https://wintech.co.ir",
    phone: "041-36309270",
    googleRank: 16,
    score: 67,
    onFirstPage: false,
    issues: ["لینک‌سازی داخلی ضعیف", "توضیحات متا تکراری"],
    proposalReady: true,
    auditMode: "estimated",
  },
  {
    id: 4,
    name: "دُرسا سازه نوین",
    sector: "یراق‌آلات",
    website: null,
    phone: "0912-315-7842",
    googleRank: 100,
    score: 0,
    onFirstPage: false,
    issues: ["وب‌سایت رسمی یافت نشد", "هویت برند در نتایج گوگل ضعیف است"],
    proposalReady: true,
    auditMode: "no-site",
  },
  {
    id: 5,
    name: "آریا شیشه شرق",
    sector: "شیشه ساختمانی",
    website: "https://ariaglass.ir",
    phone: "051-37653890",
    googleRank: null,
    score: null,
    onFirstPage: null,
    issues: [],
    proposalReady: false,
    auditMode: null,
  },
  {
    id: 6,
    name: "فراز نمای سپهر",
    sector: "نمای ساختمان",
    website: "https://faraznama.ir",
    phone: "021-44673118",
    googleRank: null,
    score: null,
    onFirstPage: null,
    issues: [],
    proposalReady: false,
    auditMode: null,
  },
  {
    id: 7,
    name: "کلینیک زیبایی ایرانیان",
    sector: "خدمات پزشکی",
    website: "https://iranianclinic.com",
    phone: "021-88774411",
    googleRank: 4,
    score: 100,
    onFirstPage: true,
    issues: [],
    proposalReady: false,
    auditMode: "live",
  },
  {
    id: 8,
    name: "کلینیک الهام",
    sector: "خدمات پزشکی",
    website: "https://elhamclinic.ir",
    phone: "021-22881122",
    googleRank: 6,
    score: 100,
    onFirstPage: true,
    issues: [],
    proposalReady: false,
    auditMode: "live",
  },
  {
    id: 9,
    name: "کلینیک گلبان",
    sector: "خدمات پزشکی",
    website: "https://golbanclinic.ir",
    phone: null,
    googleRank: 11,
    score: 93,
    onFirstPage: false,
    issues: ["تیتر H1 صفحه اصلی پیدا نشد", "شماره تماس عمومی در صفحه پیدا نشد"],
    proposalReady: true,
    auditMode: "live",
  },
  {
    id: 10,
    name: "مبل شفق تهران",
    sector: "خرده‌فروشی مبلمان",
    website: "https://shafaghfurniture.ir",
    phone: "021-55886642",
    googleRank: 32,
    score: 47,
    onFirstPage: false,
    issues: ["گواهی SSL معتبر نیست", "پاسخ سرور با تاخیر بالا"],
    proposalReady: true,
    auditMode: "live",
  },
  {
    id: 11,
    name: "استودیو آموزش راستا",
    sector: "آموزش آنلاین",
    website: "https://rasta-academy.com",
    phone: "0912-118-0033",
    googleRank: 18,
    score: 71,
    onFirstPage: false,
    issues: ["اسکیمای دوره‌های آموزشی ثبت نشده", "لینک‌سازی داخلی محدود"],
    proposalReady: true,
    auditMode: "estimated",
  },
  {
    id: 12,
    name: "دیجیتال مارکتینگ کیمیا",
    sector: "خدمات دیجیتال",
    website: "https://kimiadm.ir",
    phone: "021-77445588",
    googleRank: 9,
    score: 88,
    onFirstPage: true,
    issues: ["نمونه‌کار در صفحه اصلی محدود است"],
    proposalReady: false,
    auditMode: "live",
  },
  {
    id: 13,
    name: "طلای ماهور",
    sector: "طلا و جواهر",
    website: null,
    phone: "021-33116644",
    googleRank: null,
    score: null,
    onFirstPage: null,
    issues: [],
    proposalReady: false,
    auditMode: null,
  },
  {
    id: 14,
    name: "کارخانه لوازم‌خانگی امرتات",
    sector: "صنایع لوازم‌خانگی",
    website: "http://amrhome.co.ir",
    phone: "026-32800190",
    googleRank: null,
    score: null,
    onFirstPage: null,
    issues: [],
    proposalReady: false,
    auditMode: null,
  },
  {
    id: 15,
    name: "دفتر معماری آرکون",
    sector: "معماری و طراحی داخلی",
    website: "https://arkon-studio.ir",
    phone: "021-88991200",
    googleRank: null,
    score: null,
    onFirstPage: null,
    issues: [],
    proposalReady: false,
    auditMode: null,
  },
  {
    id: 16,
    name: "کشت و صنعت بهارستان",
    sector: "کشاورزی و بسته‌بندی",
    website: null,
    phone: "051-38220040",
    googleRank: null,
    score: null,
    onFirstPage: null,
    issues: [],
    proposalReady: false,
    auditMode: null,
  },
  {
    id: 17,
    name: "پخش دارویی نوین‌سلامت",
    sector: "پخش و توزیع",
    website: "https://novinsalamat.ir",
    phone: "021-44567890",
    googleRank: null,
    score: null,
    onFirstPage: null,
    issues: [],
    proposalReady: false,
    auditMode: null,
  },
  {
    id: 18,
    name: "شرکت حمل‌ونقل ترابر ایرانیان",
    sector: "لجستیک و ترابری",
    website: "https://tarabar-ir.com",
    phone: "021-88221399",
    googleRank: null,
    score: null,
    onFirstPage: null,
    issues: [],
    proposalReady: false,
    auditMode: null,
  },
  {
    id: 19,
    name: "ابزار صنعتی توس‌فن",
    sector: "ابزار و ماشین‌آلات",
    website: null,
    phone: "051-36229880",
    googleRank: null,
    score: null,
    onFirstPage: null,
    issues: [],
    proposalReady: false,
    auditMode: null,
  },
  ...seedCompetitors,
];

const initialLogs: LogEntry[] = [
  { id: 1, message: "ممیزی آرمان پنجره تکمیل شد", time: "۲ دقیقه پیش", tone: "good" },
  { id: 2, message: "پیشنهادنامه دُرسا سازه آماده شد", time: "۷ دقیقه پیش", tone: "good" },
  { id: 3, message: "رتبه ۶ شرکت در گوگل بررسی شد", time: "۱۲ دقیقه پیش", tone: "info" },
];

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "همه شرکت‌ها" },
  { key: "p1", label: "اولویت P1" },
  { key: "p2", label: "اولویت P2" },
  { key: "p3", label: "اولویت P3" },
  { key: "leads", label: "لیدهای شکارشده" },
  { key: "first-page", label: "صفحه اول" },
  { key: "no-site", label: "بدون وب‌سایت" },
  { key: "proposals", label: "پیشنهاد آماده" },
];

const faNumber = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

type IndustryKey =
  | "medical"
  | "sex-health"
  | "beauty"
  | "dental"
  | "wellness"
  | "seo-agency"
  | "construction"
  | "retail"
  | "education"
  | "industrial"
  | "logistics"
  | "food"
  | "legal"
  | "other";

const INDUSTRY_META: Record<IndustryKey, { label: string; tone: string; icon: LucideIcon; keywords: string[] }> = {
  medical: { label: "خدمات پزشکی عمومی", tone: "text-sky-300", icon: ShieldCheck, keywords: ["پزشک", "پزشکی", "کلینیک", "بیمارستان", "درمانگاه", "مطب", "دکتر", "medical", "clinic", "hospital", "doctor"] },
  "sex-health": { label: "کلینیک سلامت جنسی", tone: "text-rose-300", icon: ShieldAlert, keywords: ["زناشویی", "جنسی", "sex", "sexual", "sexology", "ivf", "ناباروری", "اندرولوژی"] },
  beauty: { label: "کلینیک زیبایی و پوست", tone: "text-pink-300", icon: Sparkles, keywords: ["زیبایی", "پوست", "مو", "لیزر", "بوتاکس", "فیلر", "beauty", "aesthetic", "skin", "dermatology"] },
  dental: { label: "دندان‌پزشکی", tone: "text-cyan-300", icon: ShieldCheck, keywords: ["دندان", "ارتودنسی", "implant", "dental", "dentist", "orthodontic"] },
  wellness: { label: "سلامت و تندرستی", tone: "text-emerald-300", icon: TrendingUp, keywords: ["تغذیه", "رژیم", "روان‌شناس", "مشاور", "فیزیوتراپی", "چشم‌پزشک", "ارتوپدی", "physio", "psycholog", "nutrit"] },
  "seo-agency": { label: "آژانس‌های سئو / دیجیتال", tone: "text-violet-300", icon: BarChart3, keywords: ["سئو", "seo", "دیجیتال", "digital", "مارکتینگ", "marketing", "آژانس"] },
  construction: { label: "ساختمان و معماری", tone: "text-amber-300", icon: Building2, keywords: ["پنجره", "درب", "آلومینیوم", "upvc", "شیشه", "یراق", "نما", "معماری", "طراحی داخلی", "construction"] },
  retail: { label: "خرده‌فروشی و برند", tone: "text-orange-300", icon: ShoppingBag, keywords: ["فروشگاه", "مبل", "طلا", "جواهر", "لباس", "برند", "retail", "store"] },
  education: { label: "آموزش و آکادمی", tone: "text-yellow-300", icon: BookOrPlaceholder("edu"), keywords: ["آموزش", "آکادمی", "دوره", "استودیو آموزش", "academy", "education"] },
  industrial: { label: "صنعت و ماشین‌آلات", tone: "text-slate-300", icon: SlidersHorizontal, keywords: ["صنعت", "صنعتی", "لوازم‌خانگی", "ابزار", "ماشین‌آلات", "کارخانه", "industrial", "factory"] },
  logistics: { label: "حمل‌ونقل و پخش", tone: "text-teal-300", icon: BriefcaseBusiness, keywords: ["حمل", "ترابری", "پخش", "لجستیک", "توزیع", "logistics", "shipping"] },
  food: { label: "غذا و کشاورزی", tone: "text-lime-300", icon: BookOrPlaceholder("food"), keywords: ["غذا", "رستوران", "کافه", "کشاورزی", "بسته‌بندی", "food", "restaurant", "cafe"] },
  legal: { label: "حقوقی و مالی", tone: "text-fuchsia-300", icon: BookOrPlaceholder("legal"), keywords: ["حقوق", "وکیل", "مالی", "حسابداری", "بیمه", "legal", "law", "finance"] },
  other: { label: "سایر / دسته‌بندی نشده", tone: "text-zinc-300", icon: Telescope, keywords: [] },
};

// Small helper because we don't want to import extra lucide icons
function BookOrPlaceholder(_kind: string): LucideIcon {
  return Telescope;
}

function classifyIndustry(lead: Lead): IndustryKey {
  const haystack = `${lead.sector || ""} ${lead.name || ""} ${lead.website || ""}`.toLowerCase();
  const order: IndustryKey[] = ["sex-health", "beauty", "dental", "wellness", "seo-agency", "medical", "construction", "retail", "education", "industrial", "logistics", "food", "legal"];
  for (const key of order) {
    if (INDUSTRY_META[key].keywords.some((word) => haystack.includes(word.toLowerCase()))) {
      return key;
    }
  }
  return "other";
}

type SimilarCompany = { name: string; website: string; instagram?: string; note: string };
type IndustryInsight = {
  summary: string;
  video: { title: string; youtubeId: string };
  companies: SimilarCompany[];
};

const INDUSTRY_INSIGHTS: Partial<Record<IndustryKey, IndustryInsight>> = {
  medical: {
    summary: "بازار خدمات پزشکی عمومی در تهران بسیار رقابتی است؛ سایت‌های موفق روی محتوای دقیق تخصصی، نظرات بیماران و بوکینگ آنلاین سرمایه‌گذاری می‌کنند.",
    video: { title: "SEO strategy for medical clinics (Google Search Central)", youtubeId: "hF515-0Tduk" },
    companies: [
      { name: "کلینیک ایرانیان", website: "https://iranianclinic.com", instagram: "https://instagram.com/iranianclinic", note: "برند شناخته‌شده در حوزه پزشکی زیبایی تهران" },
      { name: "کلینیک الهام", website: "https://elhamclinic.ir", instagram: "https://instagram.com/elhamclinic", note: "تمرکز بر خدمات پوست، مو و زیبایی" },
      { name: "کلینیک گلبان", website: "https://golbanclinic.ir", instagram: "https://instagram.com/golbanclinic", note: "کلینیک چندتخصصی با حضور فعال در شبکه‌های اجتماعی" },
    ],
  },
  "sex-health": {
    summary: "کلینیک‌های سلامت جنسی و زناشویی به خاطر حساسیت موضوع، به محتوای آموزشی شفاف، حریم خصوصی و مشاوره آنلاین نیاز دارند.",
    video: { title: "Digital marketing for sensitive medical niches (Semrush Academy)", youtubeId: "L0T2evbNfSg" },
    companies: [
      { name: "کلینیک ابن‌سینا", website: "https://avicenna-clinic.com", instagram: "https://instagram.com/avicennaclinic", note: "پیشرو در درمان‌های ناباروری و IVF" },
      { name: "پژوهشگاه رویان", website: "https://royaninstitute.org", instagram: "https://instagram.com/royaninstitute", note: "معتبرترین مرکز پژوهشی زیست‌فناوری تولید مثل ایران" },
      { name: "کلینیک ایرانیان زناشویی", website: "https://iranianclinic.com", instagram: "https://instagram.com/iranianclinic", note: "خدمات مشاوره زناشویی و اورولوژی" },
    ],
  },
  beauty: {
    summary: "کلینیک‌های زیبایی روی اینستاگرام و ویدیوی قبل/بعد رشد می‌کنند. سئوی محلی، نظرات گوگل و قیمت‌گذاری شفاف تفاوت اصلی هستند.",
    video: { title: "How aesthetic clinics dominate local SEO (Ahrefs)", youtubeId: "ZG3yeJRJ8xU" },
    companies: [
      { name: "کلینیک اپیدرم", website: "https://epiderm.ir", instagram: "https://instagram.com/epiderm.clinic", note: "برند شناخته‌شده در حوزه لیزر و پوست" },
      { name: "کلینیک الوند", website: "https://alvandclinic.com", instagram: "https://instagram.com/alvandclinic", note: "خدمات جامع زیبایی و پوست تهران" },
      { name: "کلینیک آرمانی کلینیک", website: "https://armaniclinic.ir", instagram: "https://instagram.com/armaniclinic", note: "تخصص در کاشت مو و درمان‌های زیبایی" },
    ],
  },
  dental: {
    summary: "کلینیک‌های دندان‌پزشکی موفق سایت‌شان را به نوبت‌دهی آنلاین، صفحات هر خدمت، اسکیمای MedicalProcedure و محتوای ویدیویی مجهز می‌کنند.",
    video: { title: "Local SEO for dental practices (Whitespark)", youtubeId: "8Q4o2E5-uJs" },
    companies: [
      { name: "کلینیک دندان‌پزشکی سیب", website: "https://sibdent.com", instagram: "https://instagram.com/sibdent", note: "کلینیک شبانه‌روزی مدرن در تهران" },
      { name: "کلینیک لبخند طلایی", website: "https://labkhandtala.com", instagram: "https://instagram.com/labkhandtala", note: "تخصص در ایمپلنت و طراحی لبخند" },
      { name: "کلینیک دندان‌پزشکی رویا", website: "https://royadent.ir", instagram: "https://instagram.com/royadent", note: "خدمات ارتودنسی، ایمپلنت و زیبایی دندان" },
    ],
  },
  wellness: {
    summary: "حوزه سلامت و تندرستی (تغذیه، فیزیوتراپی، روان‌شناسی) سریع‌ترین رشد را در جستجوهای گوگل ایران دارد؛ محتوای منظم بلاگ و ویدیوی کوتاه کلید موفقیت است.",
    video: { title: "Content marketing for wellness brands (HubSpot)", youtubeId: "aTfE3Jz7GkY" },
    companies: [
      { name: "کلینیک تغذیه کرمانی", website: "https://kermani.com", instagram: "https://instagram.com/dr.kermani", note: "پرمخاطب‌ترین برند رژیم‌درمانی آنلاین ایران" },
      { name: "کلینیک فیزیوتراپی رخ", website: "https://rokhphysio.com", instagram: "https://instagram.com/rokhphysio", note: "خدمات فیزیوتراپی تخصصی" },
      { name: "کلینیک روان‌شناسی هفت", website: "https://haftclinic.com", instagram: "https://instagram.com/haftclinic", note: "شبکه بزرگ مشاوره روان‌شناسی حضوری و آنلاین" },
    ],
  },
  "seo-agency": {
    summary: "بازار آژانس‌های سئو در ایران بسیار متمرکز است؛ نمونه‌کارها، مطالعه موردی و شفافیت گزارش‌ها بیشترین اثر را روی تصمیم‌گیری کارفرما دارند.",
    video: { title: "Digital agency growth playbook (Neil Patel)", youtubeId: "z1J8xw6P9tQ" },
    companies: [
      { name: "نوین‌مارکتینگ", website: "https://novin.marketing", instagram: "https://instagram.com/novin.marketing", note: "آژانس دیجیتال مارکتینگ با تیم بزرگ" },
      { name: "ادورداپ", website: "https://adworduap.com", instagram: "https://instagram.com/adworduap", note: "متخصص Google Ads و سئوی محلی" },
      { name: "مدیااد", website: "https://mediaad.co", instagram: "https://instagram.com/mediaad.co", note: "کمپین‌های بزرگ برندهای ایرانی" },
    ],
  },
  construction: {
    summary: "شرکت‌های ساختمانی و نما با نمایش نمونه‌کار سه‌بعدی، ویدیوی پروژه‌ها و اسکیمای LocalBusiness به بالای نتایج گوگل می‌رسند.",
    video: { title: "SEO for construction companies (Moz)", youtubeId: "M4bWx9lVv-4" },
    companies: [
      { name: "درب و پنجره وین‌تک", website: "https://wintech.co.ir", instagram: "https://instagram.com/wintech.co", note: "تولیدکننده بزرگ پنجره UPVC" },
      { name: "پروفیل آلومینیوم پارس", website: "https://pars-alum.com", instagram: "https://instagram.com/parsalum", note: "برند شناخته‌شده پروفیل نما" },
      { name: "شیشه سکوریت گلچین", website: "https://golchinsecurit.com", instagram: "https://instagram.com/golchinsecurit", note: "متخصص شیشه‌های ساختمانی و نما" },
    ],
  },
  retail: {
    summary: "خرده‌فروشی و برندهای مصرفی به وب‌سایت با ساختار محصولی قوی، اسکیمای Product و ادغام با اینستاگرام Shop نیاز دارند.",
    video: { title: "Ecommerce SEO fundamentals (Semrush)", youtubeId: "vMxUdA6Zylc" },
    companies: [
      { name: "دیجی‌کالا", website: "https://digikala.com", instagram: "https://instagram.com/digikala", note: "بزرگ‌ترین فروشگاه آنلاین ایران" },
      { name: "بامیلو", website: "https://okala.com", instagram: "https://instagram.com/okalacom", note: "سوپرمارکت آنلاین تهران" },
      { name: "مبلمان چوبینه", website: "https://choobineh.com", instagram: "https://instagram.com/choobineh_official", note: "برند مبلمان با فروشگاه آنلاین قوی" },
    ],
  },
  education: {
    summary: "پلتفرم‌های آموزشی روی محتوای ویدیویی، صفحات فرود درس‌محور و اسکیمای Course رشد می‌کنند.",
    video: { title: "Content SEO for online courses (Backlinko)", youtubeId: "Q1kNBM1I2Tg" },
    companies: [
      { name: "مکتب‌خونه", website: "https://maktabkhooneh.org", instagram: "https://instagram.com/maktabkhooneh", note: "بزرگ‌ترین آکادمی آموزش آنلاین ایران" },
      { name: "فرادرس", website: "https://faradars.org", instagram: "https://instagram.com/faradars", note: "شبکه بزرگ آموزش تخصصی" },
      { name: "کوئرا", website: "https://quera.org", instagram: "https://instagram.com/quera_college", note: "بوت‌کمپ‌های تخصصی مهندسی نرم‌افزار" },
    ],
  },
  industrial: {
    summary: "سایت‌های صنعتی موفق روی صفحات محصول عمیق، کاتالوگ PDF، ویدیوی خط تولید و اسکیمای Product سرمایه‌گذاری می‌کنند.",
    video: { title: "Industrial B2B SEO (Search Engine Journal)", youtubeId: "cS3jj9y3lIY" },
    companies: [
      { name: "امرسان", website: "https://emersun.co", instagram: "https://instagram.com/emersun.official", note: "برند بزرگ لوازم خانگی ایرانی" },
      { name: "پاکشوما", website: "https://pakshoma.com", instagram: "https://instagram.com/pakshoma_official", note: "تولیدکننده لوازم خانگی" },
      { name: "توسه ابزار", website: "https://toseabzar.com", instagram: "https://instagram.com/toseabzar", note: "وارد کننده تخصصی ابزار صنعتی" },
    ],
  },
  logistics: {
    summary: "شرکت‌های لجستیک با فرم پیگیری آنلاین، محاسبه‌گر کرایه و صفحات مسیر (Route) رشد ارگانیک می‌کنند.",
    video: { title: "SEO for logistics companies", youtubeId: "5nS7t9F1BhY" },
    companies: [
      { name: "پست پیشتاز", website: "https://post.ir", instagram: "https://instagram.com/postiranofficial", note: "شبکه ملی پست جمهوری اسلامی" },
      { name: "تیپاکس", website: "https://tipaxco.com", instagram: "https://instagram.com/tipax_co", note: "پیشرو در حمل بار و مرسولات درون‌شهری" },
      { name: "چاپار", website: "https://chapareto.com", instagram: "https://instagram.com/chapareto", note: "خدمات حمل و پخش بین‌المللی" },
    ],
  },
  food: {
    summary: "برندهای غذا و کشاورزی موفق روی سئوی محلی، بلاگ دستور پخت و ویدیوی کوتاه رشد می‌کنند.",
    video: { title: "Restaurant local SEO complete guide", youtubeId: "PfR3TWx4a4Y" },
    companies: [
      { name: "اسنپ‌فود", website: "https://snappfood.ir", instagram: "https://instagram.com/snappfood", note: "بزرگ‌ترین پلتفرم سفارش غذا" },
      { name: "کاله", website: "https://kalleh.com", instagram: "https://instagram.com/kalleh_official", note: "برند بزرگ لبنیات و غذایی" },
      { name: "میهن", website: "https://mihan.co", instagram: "https://instagram.com/mihan_dairy", note: "لبنیات و بستنی با محتوای ویدیویی قوی" },
    ],
  },
  legal: {
    summary: "دفاتر حقوقی و مالی از صفحات تخصصی، پرسش‌های متداول و اسکیمای LegalService بیشترین بهره را می‌برند.",
    video: { title: "Legal SEO best practices", youtubeId: "OaBqaJvXf1U" },
    companies: [
      { name: "دادپرداز", website: "https://dadpardaz.com", instagram: "https://instagram.com/dadpardaz", note: "شبکه ملی خدمات حقوقی آنلاین" },
      { name: "دادفر", website: "https://dadfar.ir", instagram: "https://instagram.com/dadfar_law", note: "دفتر وکالت با تمرکز روی سئوی محتوایی" },
      { name: "دیوان", website: "https://divan.legal", instagram: "https://instagram.com/divanlegal", note: "پلتفرم مشاوره حقوقی آنلاین" },
    ],
  },
};

function IndustryInsightCard({ industry }: { industry: IndustryKey }) {
  const [expanded, setExpanded] = useState(false);
  const insight = INDUSTRY_INSIGHTS[industry];
  if (!insight) return null;
  return (
    <div className="border-t border-white/[0.05] bg-black/25 px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-[11px] leading-6 text-zinc-400">{insight.summary}</p>
        <button
          onClick={() => setExpanded((current) => !current)}
          className="small-action border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200"
        >
          <PlayCircle className="h-3.5 w-3.5" />
          {expanded ? "بستن نمای صنعت" : "شرکت‌های مشابه و ویدیو"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-black/40">
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${insight.video.youtubeId}?rel=0`}
                title={insight.video.title}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
                loading="lazy"
              />
            </div>
            <div className="border-t border-white/[0.05] p-3">
              <p className="flex items-center gap-2 text-[10px] font-black text-zinc-300"><PlayCircle className="h-3.5 w-3.5 text-emerald-300" />ویدیو تحلیلی</p>
              <p className="mt-1.5 text-[10px] leading-5 text-zinc-500">{insight.video.title}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-400">شرکت‌های شاخص این حوزه</p>
            {insight.companies.map((company) => (
              <div key={company.website} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[11px] font-black text-zinc-100">{company.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-sky-400/25 bg-sky-400/[0.06] px-2 py-1 text-[9px] font-black text-sky-200 transition hover:border-sky-400/45"
                    >
                      <Globe2 className="h-3 w-3" />
                      سایت
                    </a>
                    {company.instagram && (
                      <a
                        href={company.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-pink-400/25 bg-pink-400/[0.06] px-2 py-1 text-[9px] font-black text-pink-200 transition hover:border-pink-400/45"
                      >
                        <Camera className="h-3 w-3" />
                        اینستاگرام
                      </a>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-[10px] leading-5 text-zinc-500">{company.note}</p>
                <p dir="ltr" className="mt-1.5 truncate text-[9px] font-mono text-zinc-600">{company.website.replace(/^https?:\/\//, "")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getPriority(lead: Lead): "P1" | "P2" | "P3" {
  if ((lead.siteAudit?.risks?.length ?? 0) > 0) return "P1";
  if (!lead.website || lead.onFirstPage === false || (lead.score !== null && lead.score < 55)) return "P1";
  if (lead.googleRank === null || (lead.score !== null && lead.score < 75)) return "P2";
  return "P3";
}

function hasTechRisk(lead: Lead): boolean {
  return (lead.siteAudit?.risks?.length ?? 0) > 0;
}

function getPackage(lead: Lead) {
  if (!lead.website) return { name: "راه‌اندازی وب و سئو", price: "۳۹ تا ۶۵ میلیون", tone: "amber" as const };
  if ((lead.score ?? 0) < 55) return { name: "بازسازی فنی", price: "۲۹ تا ۴۵ میلیون", tone: "rose" as const };
  if (lead.onFirstPage === false || (lead.score ?? 0) < 75) return { name: "رشد ۹۰ روزه", price: "۲۲ تا ۳۵ میلیون", tone: "emerald" as const };
  return { name: "تثبیت و محتوا", price: "۱۵ تا ۲۵ میلیون", tone: "sky" as const };
}

function makeDemoAudit(lead: Lead): SiteAudit {
  const score = lead.score ?? 62 + (lead.id % 4) * 5;
  const hasStrongSeo = score >= 75;
  const isHttp = lead.website?.startsWith("http://") ?? false;
  const risks: string[] = [];
  if (isHttp) risks.push("گواهی SSL معتبر پیدا نشد؛ وب‌سایت روی HTTP سرو می‌شود");
  if (score < 50 && lead.website) risks.push("پاسخ فنی صفحه اصلی خارج از محدوده استاندارد است");
  return {
    url: lead.website ?? "",
    finalUrl: lead.website ?? "",
    status: lead.website ? 200 : 0,
    score,
    mode: "demo",
    title: lead.website ? `${lead.name} | وب‌سایت رسمی` : "",
    metaDescription: hasStrongSeo ? "معرفی خدمات، محصولات و راه‌های ارتباطی مجموعه" : "",
    h1: hasStrongSeo ? lead.name : "",
    canonical: hasStrongSeo,
    schema: score >= 80,
    internalLinks: lead.website ? 8 + (lead.id % 6) : 0,
    robots: Boolean(lead.website),
    sitemap: hasStrongSeo,
    https: lead.website?.startsWith("https://") ?? false,
    phoneSignal: Boolean(lead.phone),
    redirectHops: 0,
    risks,
    issues: lead.website
      ? [
          ...risks,
          ...(hasStrongSeo ? [] : ["عنوان یا توضیحات متا نیاز به بهبود دارد", "تیتر H1 مشخصی پیدا نشد"]),
          ...(score < 80 ? ["داده ساختاریافته کامل نیست"] : []),
        ]
      : ["وب‌سایت عمومی برای ممیزی ثبت نشده است"],
    auditedAt: new Date().toISOString(),
  };
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function fetchSiteAudit(lead: Lead): Promise<SiteAudit> {
  if (!lead.website) return makeDemoAudit(lead);
  try {
    const response = await fetch(`/api/audit?url=${encodeURIComponent(lead.website)}`);
    if (!response.ok) throw new Error("Audit API is not available");
    const result = (await response.json()) as SiteAudit & { error?: string };
    if (result.error || typeof result.score !== "number") throw new Error(result.error || "Invalid audit result");
    return result;
  } catch {
    await delay(700);
    return makeDemoAudit(lead);
  }
}

function getViewFromPath(): View {
  const path = window.location.pathname;
  if (path.startsWith("/app") || path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/bids")) return "bids";
  if (path.startsWith("/compare")) return "compare";
  if (path.startsWith("/settings")) return "settings";
  return "landing";
}

async function hashRecipient(value: string): Promise<string> {
  if (!value) return "—";
  try {
    const encoded = new TextEncoder().encode(value);
    const buffer = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(buffer)).slice(0, 5).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return `hash_${value.length}`;
  }
}

function normalizePhone(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("98")) return digits;
  if (digits.startsWith("0")) return `98${digits.slice(1)}`;
  return digits;
}

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function buildWhatsAppUrl(target: WhatsAppTarget, phone: string, text: string): string {
  const encoded = encodeURIComponent(text);
  const digits = normalizePhone(phone);
  const resolved: Exclude<WhatsAppTarget, "auto"> = target === "auto" ? (isMobileDevice() ? "mobile" : "web") : target;
  switch (resolved) {
    case "desktop":
      return `whatsapp://send?phone=${digits}&text=${encoded}`;
    case "web":
      return digits
        ? `https://web.whatsapp.com/send?phone=${digits}&text=${encoded}`
        : `https://web.whatsapp.com/`;
    case "mobile":
    default:
      return digits
        ? `https://api.whatsapp.com/send?phone=${digits}&text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
  }
}

async function loadImageAsDataUrl(source: string): Promise<string | null> {
  if (!source) return null;
  if (source.startsWith("data:")) return source;
  try {
    const response = await fetch(source);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildProposalHtml(agency: AgencyProfile, lead: Lead, logoDataUrl: string | null): string {
  const audit = lead.siteAudit;
  const priority = getPriority(lead);
  const pkg = getPackage(lead);
  const rows: [string, string][] = [
    ["نام کسب‌وکار", lead.name],
    ["حوزه فعالیت", lead.sector || "—"],
    ["وب‌سایت", lead.website || "—"],
    ["شماره تماس", lead.phone || "—"],
    ["اولویت لید", priority],
    ["امتیاز فنی", audit ? `${faNumber(audit.score)} از ۱۰۰` : lead.score != null ? `${faNumber(lead.score)} از ۱۰۰` : "—"],
    ["رتبه گوگل برآوردی", lead.googleRank != null ? faNumber(lead.googleRank) : "—"],
    ["HTTPS", audit ? (audit.https ? "دارد" : "ندارد") : "—"],
    ["تیتر H1", audit ? (audit.h1 ? "دارد" : "ندارد") : "—"],
    ["توضیحات متا", audit ? (audit.metaDescription ? "دارد" : "ندارد") : "—"],
    ["داده ساختاریافته", audit ? (audit.schema ? "دارد" : "ندارد") : "—"],
    ["لینک‌های داخلی", audit ? faNumber(audit.internalLinks) : "—"],
  ];
  const issues = (audit?.issues?.length ? audit.issues : lead.issues) || [];
  const roadmap = [
    ["ماه اول", "رفع خطاهای فنی، تحقیق کلمات کلیدی و بازطراحی ساختار صفحات کلیدی"],
    ["ماه دوم", "تولید محتوای خدمات، بهینه‌سازی On-Page و تقویت لینک‌سازی داخلی"],
    ["ماه سوم", "لینک‌سازی بیرونی، رصد رتبه، بهینه‌سازی نرخ تبدیل و گزارش نهایی"],
  ];

  return `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        width: 794px;
        min-height: 1123px;
        font-family: "Vazirmatn", "IRANSans", "Tahoma", sans-serif;
        color: #111827;
        background: #ffffff;
        padding: 0;
      }
      .header {
        background: linear-gradient(135deg, #070a0e 0%, #0f172a 100%);
        color: #ecfdf5;
        padding: 32px 40px 26px;
        border-bottom: 4px solid #34d399;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }
      .header h1 { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.02em; }
      .header p { margin: 8px 0 0; font-size: 12px; color: #a7f3d0; }
      .logo {
        width: 76px; height: 76px; border-radius: 16px; object-fit: cover;
        border: 2px solid rgba(52, 211, 153, 0.35);
        background: rgba(255,255,255,0.04);
      }
      .content { padding: 28px 40px 32px; }
      .row-title { font-size: 12px; color: #16a34a; font-weight: 800; margin-bottom: 6px; }
      .greeting { font-size: 18px; font-weight: 900; margin: 0 0 8px; color: #0f172a; }
      .intro { font-size: 13px; line-height: 2; color: #334155; margin: 0 0 22px; }
      .card {
        border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px;
        background: #f8fafc; margin: 0 0 22px;
      }
      .card h2 {
        margin: 0 0 14px; font-size: 15px; font-weight: 900; color: #0f172a;
        display: flex; align-items: center; gap: 8px;
      }
      .badge {
        display: inline-block; padding: 2px 8px; border-radius: 6px;
        font-size: 10px; font-weight: 900; color: #065f46;
        background: #d1fae5; border: 1px solid #6ee7b7;
      }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      table td { padding: 8px 6px; border-bottom: 1px dashed #e2e8f0; vertical-align: top; }
      table td.label { color: #64748b; width: 40%; font-weight: 700; }
      table td.value { color: #0f172a; font-weight: 700; }
      ul.issues { margin: 0; padding: 0 18px 0 0; }
      ul.issues li { font-size: 12px; line-height: 2; color: #334155; margin-bottom: 4px; }
      .roadmap { display: flex; flex-direction: column; gap: 12px; }
      .roadmap .step {
        display: flex; gap: 12px; align-items: flex-start;
        border-right: 3px solid #34d399; padding: 4px 14px 4px 0;
      }
      .roadmap .step strong { font-size: 12px; color: #065f46; }
      .roadmap .step p { margin: 4px 0 0; font-size: 12px; line-height: 2; color: #334155; }
      .package-card {
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        border: 1px solid #6ee7b7; border-radius: 14px; padding: 18px 20px;
        display: flex; justify-content: space-between; align-items: center; gap: 16px;
      }
      .package-card .name { font-size: 14px; font-weight: 900; color: #065f46; }
      .package-card .price { font-size: 18px; font-weight: 900; color: #047857; }
      .footer {
        margin: 26px 40px 24px; padding: 18px 20px;
        border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc;
      }
      .footer h3 { margin: 0 0 12px; font-size: 13px; font-weight: 900; color: #0f172a; }
      .footer p { margin: 4px 0; font-size: 11px; color: #334155; line-height: 1.8; }
      .footer .value { direction: ltr; unicode-bidi: plaintext; }
      .footnote { text-align: center; font-size: 10px; color: #94a3b8; margin: 12px 40px 24px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1>${escapeHtml(agency.name || "لیدفِر")}</h1>
        <p>پیشنهاد رشد ارگانیک در گوگل — ${escapeHtml(new Date().toLocaleDateString("fa-IR"))}</p>
      </div>
      ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="logo" crossorigin="anonymous" />` : ""}
    </div>

    <div class="content">
      <div class="row-title">خطاب به مدیریت محترم</div>
      <h2 class="greeting">${escapeHtml(lead.name)}</h2>
      <p class="intro">
        در بررسی اولیه‌ی حضور آنلاین ${escapeHtml(lead.name)}، تیم ${escapeHtml(agency.name)} فرصت‌های قابل‌توجهی برای رشد رتبه‌ی گوگل شناسایی کرده است.
        در ادامه، خلاصه‌ای از وضعیت فنی، فرصت‌ها، نقشه‌راه پیشنهادی و بسته سرمایه‌گذاری ماهانه آمده است.
      </p>

      <div class="card">
        <h2>خلاصه ممیزی فنی <span class="badge">${escapeHtml(priority)}</span></h2>
        <table>
          <tbody>
            ${rows
              .map(
                ([label, value]) => `
                <tr>
                  <td class="label">${escapeHtml(label)}</td>
                  <td class="value" style="direction: ${/^[A-Za-z0-9/ .:_-]+$/.test(value) ? "ltr" : "rtl"}">${escapeHtml(value)}</td>
                </tr>
              `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2>فرصت‌های رشد شناسایی‌شده</h2>
        <ul class="issues">
          ${
            issues.length
              ? issues.slice(0, 10).map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")
              : "<li>مشکل بلاک‌کننده‌ای پیدا نشد؛ تمرکز روی مقیاس‌گذاری محتوا و اعتبار برند توصیه می‌شود.</li>"
          }
        </ul>
      </div>

      <div class="card">
        <h2>نقشه راه ۹۰ روزه پیشنهادی</h2>
        <div class="roadmap">
          ${roadmap
            .map(
              ([title, desc]) => `
              <div class="step">
                <div>
                  <strong>${escapeHtml(title)}</strong>
                  <p>${escapeHtml(desc)}</p>
                </div>
              </div>
            `,
            )
            .join("")}
        </div>
      </div>

      <div class="package-card">
        <div>
          <div style="font-size: 11px; color: #047857; font-weight: 700;">بسته پیشنهادی</div>
          <div class="name">${escapeHtml(pkg.name)}</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #065f46;">سرمایه‌گذاری ماهانه</div>
          <div class="price">${escapeHtml(pkg.price)} تومان</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <h3>📞 راه‌های ارتباطی ${escapeHtml(agency.name)}</h3>
      <p>📞 تلفن ثابت: <span class="value">${escapeHtml(agency.phone)}</span></p>
      <p>🌐 وب‌سایت رسمی: <span class="value">${escapeHtml(agency.website)}</span></p>
      <p>⏰ ساعت کاری حضوری: ${escapeHtml(agency.hours)}</p>
      <p>📍 نشانی دفتر: ${escapeHtml(agency.address)}</p>
    </div>

    <p class="footnote">این پیشنهاد بر اساس ممیزی فنی صفحه اصلی وب‌سایت تهیه شده است. رتبه دقیق گوگل نیازمند اتصال ابزار Rank Tracker محلی است.</p>
  </body>
</html>`;
}

async function buildProposalPdf(agency: AgencyProfile, lead: Lead): Promise<Blob> {
  const logo = agency.logoDataUrl ? await loadImageAsDataUrl(agency.logoDataUrl) : null;
  const html = buildProposalHtml(agency, lead, logo);

  // Render into an off-screen iframe so page styles cannot interfere and RTL works correctly.
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none;opacity:0;";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("iframe document unavailable");
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for fonts + logo image to load
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 1200);
      const done = () => {
        window.clearTimeout(timer);
        resolve();
      };
      if (doc.fonts && typeof (doc.fonts as FontFaceSet).ready?.then === "function") {
        (doc.fonts as FontFaceSet).ready.then(done).catch(done);
      } else {
        window.setTimeout(done, 500);
      }
    });

    const target = doc.body;
    const canvas = await html2canvas(target, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: 794,
      windowHeight: Math.max(1123, target.scrollHeight),
    });

    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    } else {
      // Multi-page split
      let remainingHeight = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      remainingHeight -= pageHeight;
      while (remainingHeight > 0) {
        pdf.addPage();
        position -= pageHeight;
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        remainingHeight -= pageHeight;
      }
    }

    return pdf.output("blob");
  } finally {
    iframe.remove();
  }
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function uploadPdfPublic(blob: Blob, filename: string): Promise<{ url: string; provider: string } | null> {
  // First try the app's own upload endpoint (deployed on Vercel if S3/R2 keys are set).
  try {
    const form = new FormData();
    form.append("file", blob, filename);
    const response = await fetch("/api/upload-pdf", { method: "POST", body: form });
    if (response.ok) {
      const data = (await response.json()) as { url?: string; provider?: string };
      if (data.url) return { url: data.url, provider: data.provider || "server" };
    }
  } catch {
    /* fall through */
  }

  // Public fallback: tmpfiles.org — free, CORS-enabled, files auto-expire in 1 hour.
  try {
    const form = new FormData();
    form.append("file", blob, filename);
    const response = await fetch("https://tmpfiles.org/api/v1/upload", { method: "POST", body: form });
    if (response.ok) {
      const data = (await response.json()) as { data?: { url?: string } };
      const raw = data?.data?.url;
      if (raw) {
        // tmpfiles returns a viewer URL; convert to direct download link.
        const direct = raw.replace("tmpfiles.org/", "tmpfiles.org/dl/");
        return { url: direct, provider: "tmpfiles.org (۱ ساعت اعتبار)" };
      }
    }
  } catch {
    /* fall through */
  }

  return null;
}

const DEMO_INTEGRATIONS: IntegrationStatus[] = [
  { channel: "whatsapp", ok: false, label: "WhatsApp Business (Meta Cloud API)", note: "WHATSAPP_TOKEN و WHATSAPP_PHONE_ID تنظیم نشده" },
  { channel: "telegram", ok: false, label: "Telegram Bot API", note: "TELEGRAM_BOT_TOKEN تنظیم نشده" },
  { channel: "bale", ok: false, label: "Bale Bot API (bale.ai)", note: "BALE_BOT_TOKEN تنظیم نشده — می‌توانید دستی از web.bale.ai ارسال کنید" },
  { channel: "rubika", ok: false, label: "Rubika Bot API (rubika.ir)", note: "RUBIKA_BOT_TOKEN تنظیم نشده — می‌توانید دستی از web.rubika.ir ارسال کنید" },
  { channel: "soroush", ok: false, label: "Soroush Plus Bot (soroushplus.com)", note: "SOROUSH_BOT_TOKEN تنظیم نشده — می‌توانید دستی از web.splus.ir ارسال کنید" },
  { channel: "eitaa", ok: false, label: "Eitaa Yar Webhook (eitaa.com)", note: "EITAA_TOKEN تنظیم نشده — انتقال دستی از eitaa.com فعال است" },
  { channel: "divar-chat", ok: false, label: "Divar Chat API (divar.ir)", note: "DIVAR_CHAT_TOKEN تنظیم نشده — گفت‌وگو از داخل divar.ir ادامه می‌یابد" },
  { channel: "email", ok: false, label: "SMTP / Email سرور", note: "SMTP_HOST و SMTP_USER تنظیم نشده" },
  { channel: "sms", ok: false, label: "SMS Provider Webhook", note: "SMS_WEBHOOK_URL و SMS_API_KEY تنظیم نشده" },
  { channel: "divar", ok: false, label: "Divar Partner Webhook (آگهی)", note: "دسترسی رسمی Divar Partner تنظیم نشده — حالت انتقال دستی فعال است" },
];

export default function LeadfarApp() {
  const [view, setView] = useState<View>(getViewFromPath);
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const stored = localStorage.getItem("leadfar-leads");
      return stored ? (JSON.parse(stored) as Lead[]) : seedLeads;
    } catch {
      return seedLeads;
    }
  });
  const [logs, setLogs] = useState(initialLogs);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [runningIds, setRunningIds] = useState<Set<number>>(new Set());
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [proposalLead, setProposalLead] = useState<Lead | null>(null);
  const [operationsLead, setOperationsLead] = useState<Lead | null>(null);
  const [bidOpen, setBidOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>(DEMO_INTEGRATIONS);
  const [agency, setAgency] = useState<AgencyProfile>(() => {
    try {
      const stored = localStorage.getItem("leadfar-agency");
      return stored ? { ...DEFAULT_AGENCY, ...(JSON.parse(stored) as AgencyProfile) } : DEFAULT_AGENCY;
    } catch {
      return DEFAULT_AGENCY;
    }
  });
  useEffect(() => {
    localStorage.setItem("leadfar-agency", JSON.stringify(agency));
  }, [agency]);
  const [dryRun, setDryRun] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("leadfar-dry-run");
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });
  const [sendLogs, setSendLogs] = useState<SendLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem("leadfar-send-logs");
      return stored ? (JSON.parse(stored) as SendLogEntry[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("leadfar-dry-run", String(dryRun));
  }, [dryRun]);
  useEffect(() => {
    localStorage.setItem("leadfar-send-logs", JSON.stringify(sendLogs.slice(0, 30)));
  }, [sendLogs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/integrations");
        if (!response.ok) return;
        const data = (await response.json()) as { integrations?: IntegrationStatus[] };
        if (!cancelled && data.integrations) setIntegrations(data.integrations);
      } catch {
        /* keep demo defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("leadfar-leads", JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    const onPopState = () => setView(getViewFromPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (next: View) => {
    const path = next === "landing" ? "/" : next === "dashboard" ? "/app" : `/${next}`;
    window.history.pushState({}, "", path);
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const RATE_LIMIT_PER_MINUTE = 20;
  const sendMessage = async (payload: {
    channel: Channel;
    lead: Lead;
    recipient: string;
    subject?: string;
    text: string;
    approved: boolean;
    consent: boolean;
  }): Promise<{ ok: boolean; status: SendLogEntry["status"]; message: string }> => {
    if (!payload.approved) return { ok: false, status: "failed", message: "بدون تایید انسانی نمی‌توان ارسال کرد." };
    if (!payload.consent) return { ok: false, status: "failed", message: "برای ارسال، تایید رضایت مخاطب الزامی است." };

    const oneMinuteAgo = Date.now() - 60_000;
    const recentCount = sendLogs.filter((log) => new Date(log.at).getTime() > oneMinuteAgo).length;
    if (recentCount >= RATE_LIMIT_PER_MINUTE) {
      return { ok: false, status: "failed", message: `به حد ارسال ${faNumber(RATE_LIMIT_PER_MINUTE)} پیام در دقیقه رسیدید.` };
    }

    const recipientHash = await hashRecipient(payload.recipient);
    const integrationOk = integrations.find((item) => item.channel === payload.channel)?.ok ?? false;
    let status: SendLogEntry["status"] = "queued";
    let detail = "";

    const manualFallbackMap: Partial<Record<Channel, { label: string; url: string }>> = {
      divar: { label: "Divar", url: "https://divar.ir/" },
      "divar-chat": { label: "چت Divar", url: "https://divar.ir/" },
      eitaa: { label: "ایتا", url: "https://web.eitaa.com/" },
      bale: { label: "بله", url: "https://web.bale.ai/" },
      rubika: { label: "روبیکا", url: "https://web.rubika.ir/" },
      soroush: { label: "سروش پلاس", url: "https://web.splus.ir/" },
    };

    const fallback = manualFallbackMap[payload.channel];
    if (fallback && !integrationOk) {
      status = "manual";
      detail = `متن آماده کپی است؛ ارسال دستی در ${fallback.label} انجام شود (${fallback.url}).`;
    } else if (payload.channel === "divar") {
      status = integrationOk ? "queued" : "manual";
      detail = integrationOk ? "به وبهوک شریک Divar ارسال شد" : "متن آماده کپی است؛ ارسال دستی در Divar انجام شود";
    } else if (dryRun) {
      status = "dry-run";
      detail = "حالت آزمایشی؛ پیام واقعی ارسال نشد";
    } else if (!integrationOk) {
      status = "failed";
      detail = "کلیدهای این کانال تنظیم نشده است";
    } else {
      try {
        const response = await fetch("/api/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            channel: payload.channel,
            recipient: payload.recipient,
            subject: payload.subject,
            text: payload.text,
            approved: true,
            consent: true,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as { ok?: boolean; status?: SendLogEntry["status"]; message?: string };
        if (response.ok && data.ok) {
          status = data.status ?? "sent";
          detail = data.message ?? "ارسال با موفقیت انجام شد";
        } else {
          status = "failed";
          detail = data.message ?? "پاسخ سرور نامعتبر بود";
        }
      } catch {
        status = "failed";
        detail = "ارتباط با API ارسال ناموفق بود";
      }
    }

    const entry: SendLogEntry = {
      id: Date.now() + Math.random(),
      channel: payload.channel,
      leadName: payload.lead.name,
      recipientHash,
      status,
      at: new Date().toISOString(),
      detail,
    };
    setSendLogs((current) => [entry, ...current].slice(0, 30));
    const channelLabels: Record<Channel, string> = {
      whatsapp: "واتس‌اپ",
      telegram: "تلگرام",
      bale: "بله",
      rubika: "روبیکا",
      soroush: "سروش پلاس",
      eitaa: "ایتا",
      "divar-chat": "چت دیوار",
      email: "ایمیل",
      sms: "پیامک",
      divar: "دیوار (آگهی)",
    };
    addLog(`${channelLabels[payload.channel]} برای ${payload.lead.name}: ${detail}`, status === "failed" ? "warn" : "info");
    return { ok: status !== "failed", status, message: detail };
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  const addLog = (message: string, tone: LogEntry["tone"] = "info") => {
    setLogs((current) => [
      { id: Date.now() + Math.random(), message, time: "همین حالا", tone },
      ...current.slice(0, 5),
    ]);
  };

  const analyzeLead = async (id: number) => {
    if (runningIds.has(id)) return;
    const lead = leads.find((item) => item.id === id);
    if (!lead) return;

    setRunningIds((current) => new Set(current).add(id));
    addLog(`بررسی ${lead.name} آغاز شد`);
    const noSite = !lead.website;
    const siteAudit = await fetchSiteAudit(lead);
    const score = noSite ? 0 : siteAudit.score;
    const rank = noSite ? 100 : 6 + ((id * 17) % 31);
    const onFirstPage = rank <= 10;
    const issueBank = [
      "سرعت موبایل نیاز به بهبود دارد",
      "ساختار هدینگ‌ها نامنظم است",
      "محتوای صفحات خدمات کم است",
      "لینک‌سازی داخلی ضعیف است",
    ];

    setLeads((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              score,
              googleRank: rank,
              onFirstPage,
              issues: noSite
                ? ["وب‌سایت رسمی یافت نشد", "هویت برند در نتایج گوگل ضعیف است"]
                : siteAudit.issues.length
                  ? siteAudit.issues.slice(0, 4)
                  : issueBank.slice(0, score > 72 ? 1 : 3),
              proposalReady: !onFirstPage,
              auditMode: noSite ? "no-site" : "live",
              siteAudit,
            }
          : item,
      ),
    );
    setRunningIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    addLog(
      onFirstPage
        ? `${lead.name} در صفحه اول گوگل است`
        : `لید جدید: ${lead.name} در رتبه ${faNumber(rank)}`,
      onFirstPage ? "info" : "good",
    );
  };

  const runAll = async () => {
    if (isRunningAll) return;
    setIsRunningAll(true);
    addLog("اتوماسیون بررسی همه شرکت‌ها آغاز شد", "info");
    for (const lead of leads) {
      await analyzeLead(lead.id);
    }
    setIsRunningAll(false);
    showToast("بررسی شرکت‌ها و تولید پیشنهادها کامل شد");
  };

  const importCompanies = (companies: ImportedCompany[]) => {
    const now = Date.now();
    const newLeads: Lead[] = companies.map((company, index) => ({
      id: now + index,
      name: company.name,
      website: company.website,
      phone: company.phone,
      sector: "واردشده از نمایشگاه",
      googleRank: null,
      score: null,
      onFirstPage: null,
      issues: [],
      proposalReady: false,
      auditMode: null,
    }));
    setLeads((current) => [...newLeads, ...current]);
    addLog(`${faNumber(newLeads.length)} شرکت تازه وارد شد`, "good");
    setImportOpen(false);
    showToast(`${faNumber(newLeads.length)} شرکت با موفقیت به صف بررسی اضافه شد`);
  };

  const addSingleLead = (payload: { name: string; sector: string; website: string | null; phone: string | null }) => {
    const newLead: Lead = {
      id: Date.now(),
      name: payload.name,
      sector: payload.sector || "کسب‌وکار",
      website: payload.website,
      phone: payload.phone,
      googleRank: null,
      score: null,
      onFirstPage: null,
      issues: [],
      proposalReady: false,
      auditMode: null,
    };
    setLeads((current) => [newLead, ...current]);
    addLog(`لید جدید "${newLead.name}" اضافه شد`, "good");
    setAddLeadOpen(false);
    showToast("لید جدید به فهرست اضافه شد");
  };

  const exportLeads = (format: "csv" | "json") => {
    const rows = leads.map((lead) => ({
      ...lead,
      priority: getPriority(lead),
      recommendedPackage: getPackage(lead).name,
    }));
    if (format === "json") {
      downloadFile("leadfar-leads.json", JSON.stringify(rows, null, 2), "application/json;charset=utf-8");
    } else {
      const headers = ["نام", "وب‌سایت", "تلفن", "حوزه", "اولویت", "امتیاز", "رتبه برآوردی", "بسته پیشنهادی"];
      const body = rows.map((lead) =>
        [lead.name, lead.website ?? "", lead.phone ?? "", lead.sector, lead.priority, lead.score ?? "", lead.googleRank ?? "", lead.recommendedPackage]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      );
      downloadFile("leadfar-leads.csv", `\uFEFF${[headers.join(","), ...body].join("\n")}`, "text/csv;charset=utf-8");
    }
    showToast(`خروجی ${format.toUpperCase()} آماده شد`);
  };

  const resetDemo = () => {
    setLeads(seedLeads);
    setLogs(initialLogs);
    setFilter("all");
    showToast("اطلاعات نمونه بازیابی شد");
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden text-zinc-100">
      <div className="grid-backdrop pointer-events-none fixed inset-x-0 top-0 h-[620px]" />
      <Header view={view} navigate={navigate} onImport={() => setImportOpen(true)} />

      <main className="relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-10">
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <Landing key="landing" navigate={navigate} integrations={integrations} agency={agency} />
          )}
          {view === "settings" && (
            <SettingsView
              key="settings"
              integrations={integrations}
              dryRun={dryRun}
              setDryRun={setDryRun}
              sendLogs={sendLogs}
              onClear={() => setSendLogs([])}
              onBack={() => navigate("dashboard")}
              agency={agency}
              setAgency={setAgency}
            />
          )}
          {view === "dashboard" && (
            <Dashboard
              key="dashboard"
              leads={leads}
              logs={logs}
              filter={filter}
              search={search}
              runningIds={runningIds}
              isRunningAll={isRunningAll}
              setFilter={setFilter}
              setSearch={setSearch}
              onAnalyze={analyzeLead}
              onRunAll={runAll}
              onImport={() => setImportOpen(true)}
              onProposal={setProposalLead}
              onOperations={setOperationsLead}
              onExport={exportLeads}
              onAddLead={() => setAddLeadOpen(true)}
              onDiscoverLeads={() => setDiscoverOpen(true)}
              onReset={resetDemo}
            />
          )}
          {view === "bids" && (
            <BidsMarket key="bids" onBid={() => setBidOpen(true)} onDashboard={() => navigate("dashboard")} />
          )}
          {view === "compare" && (
            <CompareView key="compare" onStart={() => navigate("dashboard")} onBid={() => setBidOpen(true)} />
          )}
        </AnimatePresence>
      </main>

      <Footer navigate={navigate} />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "50%" }}
            animate={{ opacity: 1, y: 0, x: "50%" }}
            exit={{ opacity: 0, y: 12, x: "50%" }}
            className="fixed bottom-6 right-1/2 z-[90] flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-emerald-950 shadow-2xl shadow-emerald-500/30"
          >
            <CheckCircle2 className="h-4 w-4" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={importCompanies} />
      <ProposalDrawer lead={proposalLead} onClose={() => setProposalLead(null)} showToast={showToast} />
      <LeadOperationsDrawer
        lead={operationsLead ? leads.find((lead) => lead.id === operationsLead.id) ?? operationsLead : null}
        running={operationsLead ? runningIds.has(operationsLead.id) : false}
        onClose={() => setOperationsLead(null)}
        onAudit={analyzeLead}
        showToast={showToast}
        integrations={integrations}
        dryRun={dryRun}
        sendMessage={sendMessage}
        openSettings={() => navigate("settings")}
        agency={agency}
      />
      <BidModal open={bidOpen} onClose={() => setBidOpen(false)} showToast={showToast} />
      <AddLeadModal open={addLeadOpen} onClose={() => setAddLeadOpen(false)} onAdd={addSingleLead} />
      <DiscoverLeadsModal
        open={discoverOpen}
        onClose={() => setDiscoverOpen(false)}
        onImport={(companies) => importCompanies(companies)}
      />
    </div>
  );
}

function Header({
  view,
  navigate,
  onImport,
}: {
  view: View;
  navigate: (view: View) => void;
  onImport: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const items: { key: View; label: string; icon: LucideIcon }[] = [
    { key: "landing", label: "خانه", icon: Sparkles },
    { key: "dashboard", label: "شکار لید", icon: Crosshair },
    { key: "bids", label: "بازار پیشنهادها", icon: BriefcaseBusiness },
    { key: "compare", label: "مقایسه بازار", icon: BarChart3 },
    { key: "settings", label: "تنظیمات ارسال", icon: Settings2 },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070a0e]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center px-4 sm:px-6 lg:px-10">
        <button onClick={() => navigate("landing")} className="flex items-center gap-3 text-right" aria-label="خانه لیدفر">
          <BrandMark />
          <span>
            <strong className="block text-xl font-black tracking-tight text-white">لیدفِر</strong>
            <span className="hidden text-[10px] font-medium text-zinc-500 sm:block">رادار هوشمند فروش سئو</span>
          </span>
        </button>

        <nav className="mr-10 hidden items-center gap-1 lg:flex">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                view === item.key ? "text-emerald-300" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
              {view === item.key && (
                <motion.span layoutId="nav-indicator" className="absolute inset-x-3 -bottom-[17px] h-0.5 bg-emerald-400" />
              )}
            </button>
          ))}
        </nav>

        <div className="mr-auto flex items-center gap-2">
          <span className="hidden items-center gap-2 text-[10px] font-bold text-zinc-500 md:flex">
            <i className="pulse-dot relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            سیستم آماده بررسی است
          </span>
          <button onClick={onImport} className="primary-button hidden sm:flex">
            <Import className="h-4 w-4" />
            ورود لیست شرکت‌ها
          </button>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-zinc-300 lg:hidden"
            aria-label="باز کردن منو"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/[0.06] bg-[#090d12] lg:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {items.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    navigate(item.key);
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold ${
                    view === item.key ? "bg-emerald-400/10 text-emerald-300" : "text-zinc-400"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
              <button onClick={onImport} className="primary-button mt-2 w-full justify-center sm:hidden">
                <Import className="h-4 w-4" />
                ورود لیست شرکت‌ها
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function BrandMark() {
  return (
    <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-lg shadow-emerald-950/40">
      <span className="logo-sweep absolute h-10 w-10 origin-center bg-[conic-gradient(from_0deg,transparent_70%,rgba(52,211,153,0.35))]" />
      <Radar className="relative h-5 w-5" strokeWidth={2.2} />
    </span>
  );
}

type DashboardProps = {
  leads: Lead[];
  logs: LogEntry[];
  filter: FilterKey;
  search: string;
  runningIds: Set<number>;
  isRunningAll: boolean;
  setFilter: (filter: FilterKey) => void;
  setSearch: (search: string) => void;
  onAnalyze: (id: number) => void;
  onRunAll: () => void;
  onImport: () => void;
  onProposal: (lead: Lead) => void;
  onOperations: (lead: Lead) => void;
  onExport: (format: "csv" | "json") => void;
  onAddLead: () => void;
  onDiscoverLeads: () => void;
  onReset: () => void;
};

function Dashboard({
  leads,
  logs,
  filter,
  search,
  runningIds,
  isRunningAll,
  setFilter,
  setSearch,
  onAnalyze,
  onRunAll,
  onImport,
  onProposal,
  onOperations,
  onExport,
  onAddLead,
  onDiscoverLeads,
  onReset,
}: DashboardProps) {
  const [groupByIndustry, setGroupByIndustry] = useState<boolean>(() => {
    try {
      return localStorage.getItem("leadfar-group-by-industry") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try { localStorage.setItem("leadfar-group-by-industry", String(groupByIndustry)); } catch { /* ignore */ }
  }, [groupByIndustry]);

  const stats = useMemo(() => {
    const scored = leads.filter((lead) => lead.score !== null);
    return {
      total: leads.length,
      captured: leads.filter((lead) => lead.onFirstPage === false).length,
      firstPage: leads.filter((lead) => lead.onFirstPage).length,
      noSite: leads.filter((lead) => !lead.website).length,
      proposals: leads.filter((lead) => lead.proposalReady).length,
      average: scored.length
        ? Math.round(scored.reduce((sum, lead) => sum + (lead.score ?? 0), 0) / scored.length)
        : 0,
    };
  }, [leads]);

  const visibleLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesSearch = !query || `${lead.name} ${lead.website ?? ""} ${lead.phone ?? ""}`.toLowerCase().includes(query);
      const matchesFilter =
        filter === "all" ||
        (filter === "p1" && getPriority(lead) === "P1") ||
        (filter === "p2" && getPriority(lead) === "P2") ||
        (filter === "p3" && getPriority(lead) === "P3") ||
        (filter === "leads" && lead.onFirstPage === false) ||
        (filter === "first-page" && lead.onFirstPage === true) ||
        (filter === "no-site" && !lead.website) ||
        (filter === "proposals" && lead.proposalReady);
      return matchesSearch && matchesFilter;
    });
  }, [filter, leads, search]);

  const industryGroups = useMemo(() => {
    const buckets = new Map<IndustryKey, Lead[]>();
    for (const lead of visibleLeads) {
      const key = classifyIndustry(lead);
      const existing = buckets.get(key) ?? [];
      existing.push(lead);
      buckets.set(key, existing);
    }
    return Array.from(buckets.entries())
      .map(([key, items]) => {
        const scored = items.filter((item) => item.score !== null);
        const captured = items.filter((item) => item.onFirstPage === false).length;
        const avg = scored.length ? Math.round(scored.reduce((sum, item) => sum + (item.score ?? 0), 0) / scored.length) : 0;
        return { key, meta: INDUSTRY_META[key], items, avg, captured };
      })
      .sort((a, b) => b.items.length - a.items.length);
  }, [visibleLeads]);

  const statItems = [
    { icon: Building2, label: "کل شرکت‌ها", value: stats.total, tone: "text-zinc-100" },
    { icon: Crosshair, label: "لید شکارشده", value: stats.captured, tone: "text-emerald-300" },
    { icon: CheckCircle2, label: "در صفحه اول", value: stats.firstPage, tone: "text-sky-300" },
    { icon: Globe2, label: "بدون وب‌سایت", value: stats.noSite, tone: "text-amber-300" },
    { icon: FileCheck2, label: "پیشنهاد آماده", value: stats.proposals, tone: "text-violet-300" },
    { icon: TrendingUp, label: "میانگین امتیاز", value: stats.average, tone: "text-rose-300" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="relative mx-auto max-w-4xl pb-10 pt-12 text-center sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 inline-flex items-center gap-2 text-xs font-extrabold text-emerald-400"
        >
          <Sparkles className="h-4 w-4" />
          از لیست نمایشگاه تا قرارداد سئو، تمام خودکار
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-3xl font-black leading-[1.45] tracking-tight sm:text-5xl sm:leading-[1.35]"
        >
          <span className="shimmer-text">لیدفِر</span> شرکت‌های خارج از صفحه اول گوگل را پیدا می‌کند
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-zinc-400 sm:text-base"
        >
          شرکت‌کنندگان نمایشگاه را وارد کنید. رادار لیدفِر رتبه گوگل و سلامت وب‌سایت هر شرکت را بررسی می‌کند و برای فرصت‌های واقعی فروش، پیشنهاد سئو می‌سازد.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-3"
        >
          <button onClick={onRunAll} disabled={isRunningAll} className="primary-button min-w-44 justify-center">
            {isRunningAll ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            {isRunningAll ? "اتوماسیون در حال اجرا" : "اجرای اتوماسیون"}
          </button>
          <button onClick={onAddLead} className="secondary-button">
            <Plus className="h-4 w-4" />
            افزودن لید تکی
          </button>
          <button onClick={onDiscoverLeads} className="secondary-button border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200">
            <Search className="h-4 w-4" />
            کشف لید از موتور جستجو
          </button>
          <button onClick={onImport} className="secondary-button">
            <FileInput className="h-4 w-4" />
            ورود لیست جدید
          </button>
        </motion.div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-bold text-zinc-500">
          {["ورود شرکت‌ها", "بررسی رتبه", "ممیزی سایت", "ساخت پیشنهاد"].map((step, index) => (
            <span key={step} className="flex items-center gap-2">
              <i className="grid h-5 w-5 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] text-[9px] text-emerald-300">
                {faNumber(index + 1)}
              </i>
              {step}
              {index < 3 && <ChevronLeft className="hidden h-3 w-3 text-zinc-700 sm:block" />}
            </span>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] sm:grid-cols-3 lg:grid-cols-6">
        {statItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + index * 0.05 }}
            className="stat-cell relative px-4 py-5"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
              <item.icon className={`h-3.5 w-3.5 ${item.tone}`} />
              {item.label}
            </div>
            <strong className={`mt-2 block text-2xl font-black tabular-nums ${item.tone}`}>{faNumber(item.value)}</strong>
          </motion.div>
        ))}
      </section>

      <div className="mt-9 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1">
              {filters.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-extrabold transition ${
                    filter === item.key
                      ? "bg-emerald-400 text-emerald-950"
                      : "border border-white/[0.07] bg-white/[0.025] text-zinc-500 hover:border-white/15 hover:text-zinc-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setGroupByIndustry(!groupByIndustry)}
              className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-extrabold transition ${
                groupByIndustry ? "bg-emerald-400 text-emerald-950" : "border border-white/[0.07] bg-white/[0.025] text-zinc-400 hover:border-white/15 hover:text-zinc-200"
              }`}
              title="گروه‌بندی بر اساس صنعت"
            >
              <span className="flex items-center gap-1.5"><SlidersHorizontal className="h-3 w-3" />گروه صنعتی</span>
            </button>
            <label className="relative mr-auto w-full sm:w-52">
              <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جستجوی شرکت..."
                className="input-field h-9 w-full pr-9 text-xs"
              />
            </label>
          </div>

          {groupByIndustry ? (
            <div className="space-y-5">
              <AnimatePresence mode="popLayout">
                {industryGroups.map((group) => {
                  const Icon = group.meta.icon;
                  return (
                    <motion.div
                      key={group.key}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="glass-panel overflow-hidden rounded-2xl"
                    >
                      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                        <span className={`grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] ${group.meta.tone}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-black ${group.meta.tone}`}>{group.meta.label}</p>
                          <p className="mt-0.5 text-[10px] text-zinc-500">
                            {faNumber(group.items.length)} شرکت • {faNumber(group.captured)} لید فعال • میانگین امتیاز {faNumber(group.avg)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            group.items.forEach((item) => onAnalyze(item.id));
                          }}
                          className="small-action"
                          title="اجرای ممیزی برای همه شرکت‌های این صنعت"
                        >
                          <Radar className="h-3 w-3" />
                          ممیزی گروهی
                        </button>
                      </div>
                      <IndustryInsightCard industry={group.key} />
                      <div className="divide-y divide-white/[0.05]">
                        <AnimatePresence mode="popLayout">
                          {group.items.map((lead) => (
                            <div key={lead.id} className="p-3">
                              <LeadRow
                                lead={lead}
                                running={runningIds.has(lead.id)}
                                onAnalyze={() => onAnalyze(lead.id)}
                                onProposal={() => onProposal(lead)}
                                onOperations={() => onOperations(lead)}
                              />
                            </div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {industryGroups.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
                  <Telescope className="h-8 w-8 text-emerald-300" />
                  <h3 className="mt-4 text-base font-black">دسته‌بندی صنعتی خالی است</h3>
                  <p className="mt-2 text-xs text-zinc-500">فیلترها را تغییر دهید یا لید اضافه کنید.</p>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {visibleLeads.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    running={runningIds.has(lead.id)}
                    onAnalyze={() => onAnalyze(lead.id)}
                    onProposal={() => onProposal(lead)}
                    onOperations={() => onOperations(lead)}
                  />
                ))}
              </AnimatePresence>

              {visibleLeads.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
                  <Telescope className="h-8 w-8 text-emerald-300" />
                  <h3 className="mt-4 text-base font-black">موردی با این فیلتر پیدا نشد</h3>
                  <p className="mt-2 text-xs text-zinc-500">عبارت جستجو یا فیلتر انتخابی را تغییر دهید.</p>
                </motion.div>
              )}
            </div>
          )}
        </section>

        <aside className="sticky top-24 space-y-4">
          <div className="glass-panel overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4">
              <span className="flex items-center gap-2 text-xs font-black">
                <Activity className="h-4 w-4 text-emerald-400" />
                جریان فعالیت
              </span>
              <span className="text-[9px] font-bold text-zinc-600">زنده</span>
            </div>
            <div className="divide-y divide-white/[0.05] px-4">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 py-3.5">
                  <i
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      log.tone === "good" ? "bg-emerald-400" : log.tone === "warn" ? "bg-amber-400" : "bg-sky-400"
                    }`}
                  />
                  <div>
                    <p className="text-[11px] font-bold leading-5 text-zinc-300">{log.message}</p>
                    <span className="text-[9px] text-zinc-600">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.035] p-4">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <p className="text-xs font-black text-amber-100">پیشنهاد هوشمند امروز</p>
                <p className="mt-2 text-[11px] leading-6 text-zinc-500">
                  شرکت‌های بدون وب‌سایت نرخ پاسخ بالاتری دارند. با پیشنهاد طراحی سایت و سئو هم‌زمان شروع کنید.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-y border-white/[0.06] py-3">
            <span className="flex items-center gap-2 text-[10px] font-black text-zinc-500">
              <Download className="h-3.5 w-3.5" />
              خروجی داده‌ها
            </span>
            <div className="flex gap-1">
              <button onClick={() => onExport("csv")} className="data-button">CSV</button>
              <button onClick={() => onExport("json")} className="data-button">JSON</button>
            </div>
          </div>

          <button onClick={onReset} className="flex w-full items-center justify-center gap-2 py-2 text-[10px] font-bold text-zinc-600 transition hover:text-zinc-300">
            <RefreshCw className="h-3 w-3" />
            بازیابی اطلاعات نمونه
          </button>
        </aside>
      </div>
    </motion.div>
  );
}

function LeadRow({
  lead,
  running,
  onAnalyze,
  onProposal,
  onOperations,
}: {
  lead: Lead;
  running: boolean;
  onAnalyze: () => void;
  onProposal: () => void;
  onOperations: () => void;
}) {
  const captured = lead.onFirstPage === false;
  const priority = getPriority(lead);
  const recommendedPackage = getPackage(lead);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`lead-row group relative overflow-hidden rounded-2xl border bg-white/[0.025] p-4 transition sm:p-5 ${
        captured ? "border-emerald-400/20" : "border-white/[0.07]"
      }`}
    >
      {captured && <span className="absolute inset-y-0 right-0 w-0.5 bg-gradient-to-b from-emerald-300 to-amber-300" />}
      <div className="flex flex-wrap items-center gap-4">
        <ScoreRing score={lead.score} running={running} mode={lead.auditMode} />

        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-zinc-100 sm:text-base">{lead.name}</h3>
            <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-zinc-600">{lead.sector}</span>
            {(() => {
              const industryKey = classifyIndustry(lead);
              const industryMeta = INDUSTRY_META[industryKey];
              if (industryKey === "other") return null;
              return (
                <span className={`rounded-md border border-white/[0.08] bg-white/[0.02] px-1.5 py-0.5 text-[9px] font-bold ${industryMeta.tone}`}>
                  {industryMeta.label}
                </span>
              );
            })()}
            <span className={`priority-badge priority-${priority.toLowerCase()}`}>{priority}</span>
            {hasTechRisk(lead) && (
              <span
                title={lead.siteAudit?.risks?.join(" • ")}
                className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-400/[0.06] px-1.5 py-0.5 text-[9px] font-black text-rose-300"
              >
                <ShieldAlert className="h-3 w-3" />
                ریسک فنی
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-zinc-500">
            {lead.phone && (
              <span dir="ltr" className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </span>
            )}
            {lead.website ? (
              <a
                href={lead.website}
                target="_blank"
                rel="noreferrer"
                dir="ltr"
                className="flex items-center gap-1.5 text-sky-400/80 transition hover:text-sky-300"
              >
                <Globe2 className="h-3 w-3" />
                {lead.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <span className="flex items-center gap-1.5 font-bold text-amber-300/80">
                <CircleX className="h-3 w-3" />
                بدون وب‌سایت
              </span>
            )}
          </div>
        </div>

        <div className="min-w-32">
          {lead.googleRank === null ? (
            <StatusBadge tone="zinc">بررسی نشده</StatusBadge>
          ) : lead.onFirstPage ? (
            <StatusBadge tone="sky">
              <CheckCircle2 className="h-3 w-3" />
              صفحه اول، رتبه {faNumber(lead.googleRank)}
            </StatusBadge>
          ) : (
            <StatusBadge tone="emerald">
              <Target className="h-3 w-3" />
              لید، رتبه {faNumber(lead.googleRank)}
            </StatusBadge>
          )}
          {lead.auditMode === "estimated" && <p className="mt-1.5 text-center text-[8px] font-bold text-zinc-600">رتبه برآوردی</p>}
          <p className={`mt-1.5 text-center text-[8px] font-bold package-${recommendedPackage.tone}`}>{recommendedPackage.name}</p>
        </div>

        <div className="mr-auto flex items-center gap-2">
          <button onClick={onAnalyze} disabled={running} className="icon-button" title="بررسی دوباره">
            {running ? <LoaderCircle className="h-4 w-4 animate-spin text-emerald-300" /> : <Radar className="h-4 w-4" />}
          </button>
          <button onClick={onOperations} className="small-action border-sky-400/20 bg-sky-400/[0.07] text-sky-300">
            <MoreHorizontal className="h-3.5 w-3.5" />
            عملیات لید
          </button>
          {lead.proposalReady && (
            <button onClick={onProposal} className="small-action">
              <FileCheck2 className="h-3.5 w-3.5" />
              پیشنهادنامه
            </button>
          )}
        </div>
      </div>

      {lead.issues.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/[0.05] pt-3">
          {lead.issues.slice(0, 3).map((issue) => (
            <span key={issue} className="rounded-md bg-rose-400/[0.06] px-2 py-1 text-[9px] font-bold text-rose-200/60">
              {issue}
            </span>
          ))}
        </div>
      )}
    </motion.article>
  );
}

function ScoreRing({ score, running, mode }: { score: number | null; running: boolean; mode: AuditMode | null }) {
  if (running) {
    return (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-emerald-400/20 bg-emerald-400/[0.06]">
        <LoaderCircle className="h-5 w-5 animate-spin text-emerald-300" />
      </span>
    );
  }

  if (score === null) {
    return (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.025]">
        <Telescope className="h-4 w-4 text-zinc-600" />
      </span>
    );
  }

  const tone = mode === "no-site" ? "#fbbf24" : score >= 75 ? "#34d399" : score >= 55 ? "#38bdf8" : "#fb7185";
  const circumference = 113;
  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="3" />
        <circle
          className="ring-anim"
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * score) / 100}
        />
      </svg>
      <strong className="text-[11px] font-black" style={{ color: tone }}>
        {faNumber(score)}
      </strong>
    </span>
  );
}

function StatusBadge({ children, tone }: { children: React.ReactNode; tone: "zinc" | "sky" | "emerald" }) {
  const styles = {
    zinc: "bg-white/[0.04] text-zinc-500 border-white/[0.07]",
    sky: "bg-sky-400/[0.07] text-sky-300 border-sky-400/15",
    emerald: "bg-emerald-400/[0.08] text-emerald-300 border-emerald-400/20",
  };
  return <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[9px] font-black ${styles[tone]}`}>{children}</span>;
}

function ImportModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (companies: ImportedCompany[]) => void;
}) {
  const [tab, setTab] = useState<"url" | "manual" | "html">("url");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) setError("");
  }, [open]);

  const submit = async () => {
    setError("");
    if (!value.trim()) {
      setError(tab === "url" ? "آدرس صفحه نمایشگاه را وارد کنید." : "حداقل نام یک شرکت را وارد کنید.");
      return;
    }
    setLoading(true);
    await delay(900);

    let companies: ImportedCompany[] = [];
    if (tab === "manual") {
      companies = value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, website, phone] = line.split(/[,،|]/).map((part) => part.trim());
          return {
            name,
            website: website ? (/^https?:\/\//.test(website) ? website : `https://${website}`) : null,
            phone: phone || null,
          };
        });
    } else if (tab === "html") {
      const doc = new DOMParser().parseFromString(value, "text/html");
      const names = Array.from(doc.querySelectorAll("h2, h3, .company-name, a"))
        .map((node) => node.textContent?.trim() ?? "")
        .filter((name) => name.length > 3 && name.length < 80)
        .slice(0, 12);
      companies = [...new Set(names)].map((name) => ({ name, website: null, phone: null }));
      if (!companies.length) {
        companies = value
          .replace(/<[^>]+>/g, "\n")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 3 && line.length < 80)
          .slice(0, 8)
          .map((name) => ({ name, website: null, phone: null }));
      }
    } else {
      companies = [
        { name: "آذین درب پاسارگاد", website: "https://azin-door.ir", phone: "021-46893020" },
        { name: "پروفیل سازان البرز", website: "https://alborzprofile.ir", phone: "026-34712810" },
        { name: "پیشگامان نمای ایرانیان", website: null, phone: "0912-440-1956" },
        { name: "شیشه ایمن تابان", website: "https://tabanglass.ir", phone: "021-56211877" },
      ];
    }

    setLoading(false);
    if (!companies.length) {
      setError("شرکتی در اطلاعات واردشده پیدا نشد.");
      return;
    }
    onImport(companies);
    setValue("");
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center px-4 py-8">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label="بستن"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            className="glass-panel relative z-10 w-full max-w-xl rounded-3xl p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-lg font-black">
                  <Upload className="h-5 w-5 text-emerald-300" />
                  ورود شرکت‌های نمایشگاه
                </div>
                <p className="mt-2 text-xs leading-6 text-zinc-500">اطلاعات را از صفحه نمایشگاه، کد HTML یا فهرست دستی وارد کنید.</p>
              </div>
              <button onClick={onClose} className="icon-button" aria-label="بستن پنجره">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 rounded-xl bg-black/25 p-1">
              {([
                ["url", "آدرس صفحه"],
                ["manual", "ورود دستی"],
                ["html", "کد HTML"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTab(key);
                    setValue("");
                    setError("");
                  }}
                  className={`rounded-lg px-2 py-2.5 text-[11px] font-black transition ${
                    tab === key ? "bg-white/[0.08] text-emerald-300 shadow" : "text-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {tab === "url" && (
                <>
                  <label className="field-label">آدرس صفحه شرکت‌کنندگان</label>
                  <input
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    dir="ltr"
                    placeholder="https://example.com/exhibitors"
                    className="input-field mt-2 w-full text-left"
                  />
                  <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-zinc-600">
                    <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/70" />
                    در این نسخه نمایشی، ساختار ورود URL با چند شرکت نمونه نمایش داده می‌شود. ورود دستی و HTML مستقیما در مرورگر پردازش می‌شوند.
                  </p>
                </>
              )}
              {tab === "manual" && (
                <>
                  <label className="field-label">هر شرکت در یک خط</label>
                  <textarea
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={"نام شرکت، website.ir، 021-12345678\nنام شرکت دوم، example.com، 0912-000-0000"}
                    className="input-field mt-2 min-h-36 w-full resize-none leading-7"
                  />
                </>
              )}
              {tab === "html" && (
                <>
                  <label className="field-label">کد منبع صفحه نمایشگاه</label>
                  <textarea
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    dir="ltr"
                    placeholder={'<div class="company-name">نام شرکت</div>'}
                    className="input-field mt-2 min-h-36 w-full resize-none text-left font-mono text-[11px] leading-6"
                  />
                </>
              )}
              {error && <p className="mt-3 text-[11px] font-bold text-rose-300">{error}</p>}
            </div>

            <div className="mt-7 flex justify-end gap-2">
              <button onClick={onClose} className="secondary-button">انصراف</button>
              <button onClick={submit} disabled={loading} className="primary-button min-w-36 justify-center">
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "در حال پردازش" : "استخراج شرکت‌ها"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function LeadOperationsDrawer({
  lead,
  running,
  onClose,
  onAudit,
  showToast,
  integrations,
  dryRun,
  sendMessage,
  openSettings,
  agency,
}: {
  lead: Lead | null;
  running: boolean;
  onClose: () => void;
  onAudit: (id: number) => void;
  showToast: (message: string) => void;
  integrations: IntegrationStatus[];
  dryRun: boolean;
  sendMessage: (payload: {
    channel: Channel;
    lead: Lead;
    recipient: string;
    subject?: string;
    text: string;
    approved: boolean;
    consent: boolean;
  }) => Promise<{ ok: boolean; status: SendLogEntry["status"]; message: string }>;
  openSettings: () => void;
  agency: AgencyProfile;
}) {
  const [tab, setTab] = useState<"audit" | "comms">("audit");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [approved, setApproved] = useState(false);
  const [consent, setConsent] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [whatsappTarget, setWhatsappTarget] = useState<WhatsAppTarget>("auto");
  const [pdfBuilding, setPdfBuilding] = useState(false);
  const [pdfLink, setPdfLink] = useState<{ url: string; provider: string } | null>(null);

  useEffect(() => {
    setTab("audit");
    setChannel("whatsapp");
    setApproved(false);
    setConsent(false);
    setPdfLink(null);
  }, [lead?.id]);

  const safeLead: Lead = lead ?? {
    id: 0,
    name: "",
    sector: "",
    website: null,
    phone: null,
    googleRank: null,
    score: null,
    onFirstPage: null,
    issues: [],
    proposalReady: false,
    auditMode: null,
  };
  const priority = getPriority(safeLead);
  const recommendedPackage = getPackage(safeLead);
  const audit = safeLead.siteAudit;
  const score = audit?.score ?? safeLead.score ?? 0;
  const firstIssue = safeLead.issues[0] ?? "فرصت بهبود حضور در نتایج گوگل";
  const templates = useMemo<Record<Channel, { subject?: string; body: string; recipient: string; recipientLabel: string }>>(() => {
    const signature = `\n\n—\n${agency.name}\n📞 ${agency.phone}\n🌐 ${agency.website}\n⏰ ${agency.hours}\n📍 ${agency.address}`;
    const wa = `سلام، وقت شما بخیر. من از ${agency.name} هستم. وب‌سایت ${safeLead.name} را بررسی کردیم؛ امتیاز فنی اولیه ${faNumber(score)} از ۱۰۰ است و «${firstIssue}» یکی از فرصت‌های اصلی رشد شماست. یک پیشنهاد PDF کوتاه برایتان آماده کرده‌ایم؛ اگر مایل باشید ارسال می‌کنم.${signature}`;
    const long = `سلام و احترام،\n\nاز طرف ${agency.name}. در بررسی اولیه وب‌سایت ${safeLead.name}، امتیاز فنی ${faNumber(score)} از ۱۰۰ ثبت شد. مهم‌ترین فرصت فعلی: ${firstIssue}.\n\nپیشنهاد ما اجرای بسته «${recommendedPackage.name}» است که روی اصلاح فنی، محتوای هدفمند و افزایش ورودی باکیفیت در یک برنامه ۹۰ روزه تمرکز دارد. فایل PDF پیشنهاد را ضمیمه کرده‌ایم.${signature}`;
    const phoneFormatted = normalizePhone(safeLead.phone);
    return {
      whatsapp: { body: wa, recipient: phoneFormatted, recipientLabel: "شماره واتس‌اپ (بین‌المللی)" },
      telegram: { body: wa, recipient: "", recipientLabel: "chat_id یا @username تلگرام" },
      bale: { body: wa, recipient: "", recipientLabel: "@username یا chat_id بله" },
      rubika: { body: wa, recipient: "", recipientLabel: "@username یا guid روبیکا" },
      soroush: { body: wa, recipient: "", recipientLabel: "@username یا chat_id سروش پلاس" },
      eitaa: { body: wa, recipient: "", recipientLabel: "@username یا chat_id ایتا" },
      "divar-chat": { body: wa, recipient: "", recipientLabel: "لینک آگهی divar.ir/v/..." },
      email: { subject: `پیشنهاد سئو ${agency.name} برای ${safeLead.name}`, body: long, recipient: "", recipientLabel: "آدرس ایمیل مخاطب" },
      sms: { body: `${safeLead.name} عزیز، از ${agency.name}. امتیاز فنی سایت شما ${faNumber(score)}/۱۰۰. برای دریافت گزارش PDF پاسخ دهید بله. ${agency.phone}`, recipient: phoneFormatted, recipientLabel: "شماره موبایل" },
      divar: { body: wa, recipient: "", recipientLabel: "لینک آگهی یا شناسه Divar" },
    };
  }, [agency, firstIssue, safeLead.name, safeLead.phone, recommendedPackage.name, score]);

  useEffect(() => {
    const tpl = templates[channel];
    setRecipient(tpl.recipient);
    setSubject(tpl.subject ?? "");
    setMessage(tpl.body);
  }, [channel, templates]);

  const [discoveredPhones, setDiscoveredPhones] = useState<DiscoveredPhone[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState<string>("");
  useEffect(() => { setDiscoveredPhones([]); setDiscoveryMessage(""); }, [lead?.id]);

  if (!lead) return null;

  const channelStatus = integrations.find((item) => item.channel === channel);
  const activeMessage = message;
  const copyOutreach = async () => {
    if (!approved) return;
    await navigator.clipboard.writeText(activeMessage);
    showToast("متن تاییدشده کپی شد");
  };

  const openWhatsApp = (target: WhatsAppTarget = whatsappTarget) => {
    if (!approved || !recipient) return;
    const url = buildWhatsAppUrl(target, recipient, message);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openDivar = () => {
    if (!approved) return;
    const target = recipient.startsWith("http") ? recipient : "https://divar.ir";
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const dispatchMessage = async () => {
    if (sending) return;
    setSending(true);
    const result = await sendMessage({ channel, lead, recipient, subject, text: message, approved, consent });
    setSending(false);
    showToast(result.message);
  };

  const downloadPdf = async () => {
    if (pdfBuilding) return;
    setPdfBuilding(true);
    try {
      const blob = await buildProposalPdf(agency, lead);
      const safeName = lead.name.replace(/[^\p{L}\p{N}\-_ ]+/gu, "").replace(/\s+/g, "-").slice(0, 40) || "proposal";
      downloadBlob(`${agency.name.replace(/\s+/g, "-")}-${safeName}.pdf`, blob);
      showToast("فایل PDF پیشنهاد آماده شد");
    } catch {
      showToast("ساخت PDF ناموفق بود");
    } finally {
      setPdfBuilding(false);
    }
  };

  const sharePdf = async () => {
    if (pdfBuilding) return;
    setPdfBuilding(true);
    try {
      const blob = await buildProposalPdf(agency, lead);
      const file = new File([blob], "proposal.pdf", { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void> };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: `پیشنهاد ${agency.name}`, text: message });
        showToast("پنجره اشتراک‌گذاری PDF باز شد");
      } else {
        downloadBlob(`${agency.name}-${lead.name}.pdf`, blob);
        showToast("در این مرورگر اشتراک مستقیم فایل ممکن نبود؛ فایل دانلود شد");
      }
    } catch {
      showToast("اشتراک‌گذاری PDF ناموفق بود");
    } finally {
      setPdfBuilding(false);
    }
  };

  const uploadPdfLink = async () => {
    if (pdfBuilding) return;
    setPdfBuilding(true);
    try {
      const blob = await buildProposalPdf(agency, lead);
      const safeName = `${agency.name.replace(/\s+/g, "-")}-${lead.name.replace(/\s+/g, "-")}`.replace(/[^\p{L}\p{N}\-_]+/gu, "").slice(0, 60) || "proposal";
      const uploaded = await uploadPdfPublic(blob, `${safeName}.pdf`);
      if (uploaded) {
        setPdfLink(uploaded);
        const attachment = `\n\n📎 فایل PDF پیشنهاد:\n${uploaded.url}`;
        if (!message.includes(uploaded.url)) {
          setMessage(`${message}${attachment}`);
        }
        showToast(`لینک PDF ساخته شد (${uploaded.provider})`);
      } else {
        downloadBlob(`${safeName}.pdf`, blob);
        showToast("بارگذاری آنلاین ممکن نشد؛ PDF دانلود شد تا خودتان ضمیمه کنید");
      }
    } catch {
      showToast("ساخت یا بارگذاری PDF ناموفق بود");
    } finally {
      setPdfBuilding(false);
    }
  };

  const discoverPhones = async () => {
    if (discovering || !lead?.website) {
      if (!lead?.website) showToast("این لید وب‌سایت ندارد؛ جستجو ممکن نیست");
      return;
    }
    setDiscovering(true);
    setDiscoveryMessage("در حال بررسی صفحات تماس، درباره ما و …");
    try {
      const response = await fetch(`/api/discover-phones?url=${encodeURIComponent(lead.website)}`);
      if (!response.ok) throw new Error("service");
      const data = (await response.json()) as { phones?: DiscoveredPhone[]; message?: string; mobileCount?: number };
      const list = data.phones ?? [];
      setDiscoveredPhones(list);
      setDiscoveryMessage(data.message ?? "");
      if (list.length) {
        showToast(`${faNumber(list.length)} شماره پیدا شد (${faNumber(data.mobileCount ?? 0)} موبایل)`);
      } else {
        showToast(data.message || "شماره‌ای در وب‌سایت پیدا نشد");
      }
    } catch {
      const fallback: DiscoveredPhone[] = [];
      if (lead?.phone) {
        const e164 = `+${normalizePhone(lead.phone)}`;
        const isMobile = /^\+989\d{9}$/.test(e164);
        fallback.push({
          e164,
          display: lead.phone,
          type: isMobile ? "mobile" : "landline",
          sources: ["cached"],
          pages: ["local"],
        });
      }
      setDiscoveredPhones(fallback);
      setDiscoveryMessage(fallback.length ? "حالت آفلاین" : "");
      showToast(fallback.length ? "حالت آفلاین: شماره ذخیره‌شده استفاده شد" : "جستجو در حالت آفلاین ممکن نیست");
    } finally {
      setDiscovering(false);
    }
  };

  const pickDiscoveredPhone = (phone: DiscoveredPhone | string) => {
    const value = typeof phone === "string" ? phone : phone.e164;
    setRecipient(normalizePhone(value));
    showToast(`شماره ${value} انتخاب شد`);
  };

  const openWhatsAppWithPdf = async () => {
    if (!approved || !recipient) return;
    let attachment = pdfLink;
    if (!attachment) {
      setPdfBuilding(true);
      try {
        const blob = await buildProposalPdf(agency, lead);
        const safeName = `${agency.name.replace(/\s+/g, "-")}-${lead.name.replace(/\s+/g, "-")}`.replace(/[^\p{L}\p{N}\-_]+/gu, "").slice(0, 60) || "proposal";
        attachment = await uploadPdfPublic(blob, `${safeName}.pdf`);
        if (attachment) setPdfLink(attachment);
      } catch {
        attachment = null;
      } finally {
        setPdfBuilding(false);
      }
    }
    const combined = attachment && !message.includes(attachment.url)
      ? `${message}\n\n📎 فایل PDF پیشنهاد:\n${attachment.url}`
      : message;
    if (attachment && combined !== message) setMessage(combined);
    const url = buildWhatsAppUrl(whatsappTarget, recipient, combined);
    window.open(url, "_blank", "noopener,noreferrer");
    if (!attachment) showToast("لینک آنلاین ساخته نشد؛ متن بدون لینک ارسال می‌شود");
  };

  const auditChecks = audit
    ? [
        ["پاسخ صفحه", audit.status >= 200 && audit.status < 400, `HTTP ${audit.status}`],
        ["اتصال امن", audit.https, audit.https ? "HTTPS" : "HTTP"],
        ["عنوان صفحه", Boolean(audit.title), audit.title || "پیدا نشد"],
        ["توضیحات متا", Boolean(audit.metaDescription), audit.metaDescription || "پیدا نشد"],
        ["تیتر اصلی H1", Boolean(audit.h1), audit.h1 || "پیدا نشد"],
        ["آدرس Canonical", audit.canonical, audit.canonical ? "ثبت شده" : "پیدا نشد"],
        ["داده ساختاریافته", audit.schema, audit.schema ? "JSON-LD" : "پیدا نشد"],
        ["لینک داخلی", audit.internalLinks >= 3, `${faNumber(audit.internalLinks)} لینک`],
        ["robots.txt", audit.robots, audit.robots ? "در دسترس" : "در دسترس نیست"],
        ["sitemap.xml", audit.sitemap, audit.sitemap ? "در دسترس" : "در دسترس نیست"],
        ["نشانه تلفن", audit.phoneSignal, audit.phoneSignal ? "پیدا شد" : "پیدا نشد"],
      ] as const
    : [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[76]">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          aria-label="بستن"
        />
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 280 }}
          className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#090d12] shadow-2xl"
        >
          <div className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#090d12]/95 px-4 py-3 backdrop-blur-xl sm:px-7 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`priority-badge priority-${priority.toLowerCase()}`}>{priority}</span>
                  <p className="text-[10px] font-black text-emerald-400">مرکز عملیات لید</p>
                </div>
                <h2 className="mt-1.5 text-base font-black">{lead.name}</h2>
              </div>
              <button onClick={onClose} className="icon-button" aria-label="بستن"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-black/25 p-1">
              {([
                ["audit", "ممیزی زنده", ListChecks],
                ["comms", "ارتباط چندکانالی", Megaphone],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black transition ${
                    tab === key ? "bg-white/[0.08] text-emerald-300" : "text-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
              <button onClick={openSettings} className="mr-auto flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black text-zinc-600 hover:text-emerald-300">
                <Settings2 className="h-3.5 w-3.5" />
                کلیدها
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-7">
            <div className="grid gap-3 sm:grid-cols-3">
              <ProposalMetric label="امتیاز فرصت" value={`${faNumber(score)} از ۱۰۰`} />
              <ProposalMetric label="بسته پیشنهادی" value={recommendedPackage.name} />
              <ProposalMetric label="بازه سرمایه‌گذاری" value={recommendedPackage.price} />
            </div>

            {tab === "audit" ? (
              <div className="mt-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-black"><Radar className="h-4 w-4 text-emerald-300" />ممیزی فنی صفحه اصلی</h3>
                    <p className="mt-1.5 text-[10px] leading-5 text-zinc-600">
                      {audit?.mode === "live" ? "نتیجه واقعی از سرور امن لیدفِر" : audit ? "داده نمایشی آفلاین" : "برای دریافت نتیجه، ممیزی را اجرا کنید"}
                    </p>
                  </div>
                  <button onClick={() => onAudit(lead.id)} disabled={running} className="primary-button">
                    {running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
                    {running ? "در حال بررسی" : audit ? "ممیزی دوباره" : "اجرای ممیزی"}
                  </button>
                </div>

                {audit ? (
                  <>
                    <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07]">
                      {auditChecks.map(([label, passed, value]) => (
                        <AuditCheck key={label} label={label} passed={passed} value={value} />
                      ))}
                    </div>
                    {audit.issues.length > 0 && (
                      <div className="mt-5">
                        <p className="text-[10px] font-black text-zinc-400">فرصت‌های شناسایی‌شده</p>
                        <div className="mt-3 space-y-2">
                          {audit.issues.map((issue) => (
                            <p key={issue} className="flex items-start gap-2 text-[11px] leading-6 text-zinc-500">
                              <CircleAlert className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-300" />
                              {issue}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-state mt-6 min-h-56">
                    <Gauge className="h-8 w-8 text-zinc-700" />
                    <p className="mt-3 text-xs font-black text-zinc-400">هنوز ممیزی دقیقی ثبت نشده است</p>
                    <p className="mt-2 max-w-sm text-center text-[10px] leading-5 text-zinc-600">در Vercel، ممیزی با API واقعی اجرا می‌شود. پیش‌نمایش محلی به‌صورت خودکار از حالت نمایشی استفاده می‌کند.</p>
                  </div>
                )}

                <p className="mt-5 rounded-xl border border-sky-400/10 bg-sky-400/[0.03] p-3 text-[9px] leading-5 text-zinc-600">
                  این امتیاز فقط سلامت فنی و سئوی داخلی صفحه اصلی را نشان می‌دهد. رتبه دقیق گوگل نیازمند اتصال API رهگیری رتبه با موقعیت جغرافیایی مشخص است.
                </p>
              </div>
            ) : (
              <CommsPanel
                lead={lead}
                agency={agency}
                channel={channel}
                setChannel={setChannel}
                recipient={recipient}
                setRecipient={setRecipient}
                subject={subject}
                setSubject={setSubject}
                message={message}
                setMessage={setMessage}
                approved={approved}
                setApproved={setApproved}
                consent={consent}
                setConsent={setConsent}
                sending={sending}
                integrations={integrations}
                dryRun={dryRun}
                whatsappTarget={whatsappTarget}
                setWhatsappTarget={setWhatsappTarget}
                pdfBuilding={pdfBuilding}
                pdfLink={pdfLink}
                onCopy={copyOutreach}
                onWhatsApp={openWhatsApp}
                onWhatsAppWithPdf={openWhatsAppWithPdf}
                onDivar={openDivar}
                onDispatch={dispatchMessage}
                onDownloadPdf={downloadPdf}
                onSharePdf={sharePdf}
                onUploadPdf={uploadPdfLink}
                onOpenSettings={openSettings}
                channelStatus={channelStatus}
                discoveredPhones={discoveredPhones}
                discovering={discovering}
                discoveryMessage={discoveryMessage}
                onDiscoverPhones={discoverPhones}
                onPickPhone={pickDiscoveredPhone}
              />
            )}
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}

function AuditCheck({ label, passed, value }: { label: string; passed: boolean; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-white/[0.055] px-4 py-3 last:border-0">
      <span className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
        {passed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <CircleX className="h-3.5 w-3.5 text-rose-400" />}
        {label}
      </span>
      <span dir={label === "عنوان صفحه" || label === "توضیحات متا" ? "rtl" : "ltr"} className={`max-w-72 truncate text-[9px] ${passed ? "text-zinc-500" : "text-rose-300/70"}`}>{value}</span>
    </div>
  );
}

function ProposalDrawer({ lead, onClose, showToast }: { lead: Lead | null; onClose: () => void; showToast: (message: string) => void }) {
  const proposalText = lead
    ? `پیشنهاد بهبود حضور گوگل برای ${lead.name}: برنامه ۹۰ روزه شامل تحقیق کلمات کلیدی، بهینه‌سازی فنی و تولید محتوای هدفمند.`
    : "";

  const copyProposal = async () => {
    await navigator.clipboard.writeText(proposalText);
    showToast("متن پیشنهادنامه کپی شد");
  };

  return (
    <AnimatePresence>
      {lead && (
        <div className="fixed inset-0 z-[75]">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="بستن"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#0a0e13] shadow-2xl"
          >
            <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#0a0e13]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
              <div>
                <p className="text-[10px] font-black text-emerald-400">پیشنهادنامه آماده ارسال</p>
                <h2 className="mt-1 text-sm font-black">{lead.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={copyProposal} className="icon-button" title="کپی متن"><Copy className="h-4 w-4" /></button>
                <button onClick={() => window.print()} className="icon-button" title="چاپ یا PDF"><Download className="h-4 w-4" /></button>
                <button onClick={onClose} className="icon-button" aria-label="بستن"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="print-page p-5 sm:p-8">
              <div className="flex items-center justify-between border-b border-emerald-400/20 pb-7">
                <div className="flex items-center gap-3">
                  <BrandMark />
                  <div>
                    <strong className="text-xl font-black">لیدفِر</strong>
                    <p className="text-[10px] text-zinc-500">پیشنهاد رشد ارگانیک در گوگل</p>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-600">اعتبار پیشنهاد: ۱۴ روز</span>
              </div>

              <div className="py-8">
                <span className="text-xs font-bold text-emerald-300">خطاب به مدیریت محترم</span>
                <h1 className="mt-2 text-2xl font-black">{lead.name}</h1>
                <p className="mt-5 text-sm leading-8 text-zinc-400">
                  بررسی اولیه تیم ما نشان می‌دهد وب‌سایت شما با وجود ظرفیت مناسب بازار، برای کلمات کلیدی اصلی در صفحه اول گوگل حضور پایدار ندارد. این پیشنهاد، یک مسیر اجرایی شفاف برای افزایش دیده‌شدن و تبدیل جستجوها به سرنخ فروش ارائه می‌کند.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ProposalMetric label="رتبه فعلی" value={lead.googleRank ? faNumber(lead.googleRank) : "نامشخص"} />
                <ProposalMetric label="امتیاز فنی" value={`${faNumber(lead.score ?? 0)} از ۱۰۰`} />
                <ProposalMetric label="هدف ۹۰ روزه" value="صفحه اول گوگل" />
              </div>

              <section className="mt-8">
                <h3 className="flex items-center gap-2 text-sm font-black"><ClipboardCheck className="h-4 w-4 text-emerald-300" />نقشه راه پیشنهادی</h3>
                <div className="mt-4 space-y-0 border-r border-emerald-400/20 pr-5">
                  {[
                    ["ماه اول", "رفع خطاهای فنی، تحقیق کلمات کلیدی و اصلاح ساختار صفحات"],
                    ["ماه دوم", "تولید محتوای خدمات و تقویت لینک‌سازی داخلی"],
                    ["ماه سوم", "اعتبارسازی بیرونی، پایش رتبه و بهینه‌سازی نرخ تبدیل"],
                  ].map(([month, description]) => (
                    <div key={month} className="relative pb-6 last:pb-0">
                      <i className="absolute -right-[25px] top-1 h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-[#0a0e13]" />
                      <p className="text-xs font-black text-zinc-200">{month}</p>
                      <p className="mt-1 text-[11px] leading-6 text-zinc-500">{description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500">سرمایه‌گذاری ماهانه پیشنهادی</p>
                    <p className="mt-2 text-2xl font-black text-emerald-300">۲۴,۹۰۰,۰۰۰ <small className="text-xs">تومان</small></p>
                  </div>
                  <button onClick={() => showToast("درخواست تماس ثبت شد")} className="primary-button no-print">
                    <Phone className="h-4 w-4" />
                    درخواست جلسه
                  </button>
                </div>
              </section>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function ProposalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
      <span className="text-[9px] font-bold text-zinc-600">{label}</span>
      <strong className="mt-1.5 block text-xs font-black text-zinc-200">{value}</strong>
    </div>
  );
}

function BidsMarket({ onBid, onDashboard }: { onBid: () => void; onDashboard: () => void }) {
  const requests = [
    { name: "فروشگاه چوبینه", need: "سئو فروشگاه و ۱۲۰۰ محصول", budget: "۳۵ تا ۵۰ میلیون", offers: 8, time: "۲ ساعت" },
    { name: "کلینیک آوان", need: "سئو محلی و تولید محتوا", budget: "۲۰ تا ۳۰ میلیون", offers: 5, time: "۵ ساعت" },
    { name: "تجهیز صنعت نوین", need: "بازطراحی سایت و سئو B2B", budget: "۶۰ تا ۸۰ میلیون", offers: 11, time: "امروز" },
    { name: "آکادمی رستا", need: "استراتژی محتوا و لینک‌سازی", budget: "۱۵ تا ۲۵ میلیون", offers: 3, time: "امروز" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-12 sm:pt-16">
      <section className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-black text-emerald-400"><BriefcaseBusiness className="h-4 w-4" />بازار پروژه‌های تاییدشده</p>
        <h1 className="mt-4 text-3xl font-black leading-[1.4] sm:text-5xl">فرصت بعدی آژانس شما همین‌جاست</h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-zinc-500">درخواست‌های واقعی کسب‌وکارها را ببینید، متناسب با ظرفیت تیم پیشنهاد بدهید و مسیر مذاکره را از یک نقطه مدیریت کنید.</p>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <span className="text-xs font-black">درخواست‌های فعال</span>
            <button className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500"><SlidersHorizontal className="h-3.5 w-3.5" />فیلتر درخواست‌ها</button>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {requests.map((request, index) => (
              <motion.article
                key={request.name}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className="group p-5 transition hover:bg-white/[0.025]"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/[0.07] text-emerald-300"><Building2 className="h-5 w-5" /></span>
                  <div className="min-w-44 flex-1">
                    <h3 className="text-sm font-black">{request.name}</h3>
                    <p className="mt-1 text-[11px] text-zinc-500">{request.need}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-600">بودجه ماهانه</p>
                    <strong className="mt-1 block text-xs font-black text-emerald-300">{request.budget}</strong>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-zinc-600">پیشنهاد</p>
                    <strong className="mt-1 block text-xs font-black">{faNumber(request.offers)}</strong>
                  </div>
                  <button onClick={onBid} className="small-action">ارسال پیشنهاد<ArrowLeft className="h-3.5 w-3.5" /></button>
                </div>
                <p className="mt-3 flex items-center gap-1 text-[9px] text-zinc-700"><Clock3 className="h-3 w-3" />ثبت‌شده {request.time} پیش</p>
              </motion.article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="glass-panel rounded-2xl p-5">
            <ShieldCheck className="h-6 w-6 text-emerald-300" />
            <h3 className="mt-4 text-sm font-black">پروژه‌های راستی‌آزمایی‌شده</h3>
            <p className="mt-2 text-[11px] leading-6 text-zinc-500">اطلاعات تماس و نیاز هر کسب‌وکار پیش از انتشار توسط لیدفِر بررسی می‌شود.</p>
          </div>
          <div className="rounded-2xl border border-sky-400/15 bg-sky-400/[0.04] p-5">
            <p className="text-[10px] font-bold text-sky-300">عملکرد این ماه</p>
            <strong className="mt-2 block text-3xl font-black">۳ از ۷</strong>
            <p className="mt-1 text-[10px] text-zinc-500">پیشنهاد شما وارد مذاکره شده است</p>
          </div>
          <button onClick={onDashboard} className="secondary-button w-full justify-center"><Crosshair className="h-4 w-4" />بازگشت به شکار لید</button>
        </aside>
      </div>
    </motion.div>
  );
}

function CompareView({ onStart, onBid }: { onStart: () => void; onBid: () => void }) {
  const plans = [
    {
      name: "فریلنسر متخصص",
      price: "۱۲ تا ۲۵ میلیون",
      icon: Users,
      tone: "text-sky-300",
      features: ["ارتباط مستقیم با متخصص", "مناسب کسب‌وکار کوچک", "ظرفیت اجرایی محدود", "گزارش‌دهی توافقی"],
      action: "مشاهده پیشنهادها",
    },
    {
      name: "آژانس رشد",
      price: "۲۵ تا ۶۰ میلیون",
      icon: Sparkles,
      tone: "text-emerald-300",
      features: ["تیم چندتخصصی کامل", "استراتژی و اجرای یکپارچه", "گزارش ماهانه ساختاریافته", "پشتیبانی و مدیریت پروژه"],
      action: "دریافت پیشنهاد آژانس‌ها",
      featured: true,
    },
    {
      name: "تیم سازمانی",
      price: "از ۷۰ میلیون",
      icon: Building2,
      tone: "text-violet-300",
      features: ["تیم اختصاصی برند", "ظرفیت تولید محتوای بالا", "تحلیل داده پیشرفته", "قرارداد و SLA سازمانی"],
      action: "درخواست مشاوره",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-12 sm:pt-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="flex items-center justify-center gap-2 text-xs font-black text-emerald-400"><Gauge className="h-4 w-4" />مقایسه شفاف بازار سئو</p>
        <h1 className="mt-4 text-3xl font-black leading-[1.4] sm:text-5xl">مدل همکاری مناسب رشدتان را انتخاب کنید</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-zinc-500">هزینه، ظرفیت اجرا و سطح پشتیبانی گزینه‌های رایج بازار را کنار هم ببینید و آگاهانه وارد مذاکره شوید.</p>
      </section>

      <section className="mx-auto mt-12 grid max-w-5xl gap-4 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <motion.article
            key={plan.name}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={`relative rounded-2xl border p-6 ${
              plan.featured ? "border-emerald-400/35 bg-emerald-400/[0.055]" : "border-white/[0.08] bg-white/[0.02]"
            }`}
          >
            {plan.featured && <span className="absolute left-5 top-0 -translate-y-1/2 rounded-md bg-emerald-400 px-2.5 py-1 text-[9px] font-black text-emerald-950">انتخاب پیشنهادی</span>}
            <plan.icon className={`h-6 w-6 ${plan.tone}`} />
            <h2 className="mt-5 text-lg font-black">{plan.name}</h2>
            <p className="mt-2 text-[10px] text-zinc-600">میانگین سرمایه‌گذاری ماهانه</p>
            <strong className={`mt-1 block text-xl font-black ${plan.tone}`}>{plan.price}</strong>
            <div className="my-6 h-px bg-white/[0.07]" />
            <ul className="space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-[11px] font-bold text-zinc-400"><Check className="h-3.5 w-3.5 text-emerald-400" />{feature}</li>
              ))}
            </ul>
            <button onClick={plan.featured ? onBid : onStart} className={plan.featured ? "primary-button mt-7 w-full justify-center" : "secondary-button mt-7 w-full justify-center"}>
              {plan.action}<ArrowLeft className="h-4 w-4" />
            </button>
          </motion.article>
        ))}
      </section>

      <section className="mx-auto mt-12 flex max-w-5xl flex-col items-center justify-between gap-5 border-y border-white/[0.07] py-8 text-center sm:flex-row sm:text-right">
        <div>
          <h3 className="text-base font-black">هنوز برای انتخاب مطمئن نیستید؟</h3>
          <p className="mt-2 text-xs text-zinc-500">یک ممیزی اولیه اجرا کنید تا اندازه واقعی پروژه مشخص شود.</p>
        </div>
        <button onClick={onStart} className="primary-button"><Radar className="h-4 w-4" />شروع ممیزی رایگان</button>
      </section>
    </motion.div>
  );
}

function BidModal({ open, onClose, showToast }: { open: boolean; onClose: () => void; showToast: (message: string) => void }) {
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!price.trim() || !message.trim()) return;
    onClose();
    setPrice("");
    setMessage("");
    showToast("پیشنهاد شما ثبت شد و برای کارفرما ارسال می‌شود");
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label="بستن" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="glass-panel relative z-10 w-full max-w-md rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-[10px] font-black text-emerald-400">ارسال پیشنهاد همکاری</p><h2 className="mt-1 text-lg font-black">پیشنهاد حرفه‌ای شما</h2></div>
              <button onClick={onClose} className="icon-button"><X className="h-4 w-4" /></button>
            </div>
            <label className="field-label mt-6 block">هزینه ماهانه پیشنهادی</label>
            <div className="relative mt-2">
              <Banknote className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="مثلا ۲۸,۰۰۰,۰۰۰ تومان" className="input-field w-full pr-10" />
            </div>
            <label className="field-label mt-5 block">پیام و برنامه پیشنهادی</label>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="کوتاه توضیح دهید چگونه به هدف پروژه می‌رسید..." className="input-field mt-2 min-h-32 w-full resize-none leading-6" />
            <button onClick={submit} disabled={!price.trim() || !message.trim()} className="primary-button mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" />ثبت و ارسال پیشنهاد</button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const CHANNEL_META: Record<Channel, { label: string; icon: LucideIcon; tone: string; recipientHint: string; description: string; webApp?: string; homepage?: string }> = {
  whatsapp: {
    label: "واتس‌اپ Business",
    icon: MessageCircle,
    tone: "text-emerald-300",
    recipientHint: "989121234567",
    description: "ارسال با Meta Cloud API. برای استفاده باید قالب پیام تایید شده باشد.",
    webApp: "https://web.whatsapp.com/",
    homepage: "https://business.whatsapp.com/",
  },
  telegram: {
    label: "تلگرام (Bot API)",
    icon: Send,
    tone: "text-sky-300",
    recipientHint: "@username یا chat_id عددی",
    description: "بات باید در چت اضافه شده باشد؛ ارسال به کاربران ناشناس مجاز نیست.",
    webApp: "https://web.telegram.org/",
    homepage: "https://telegram.org/",
  },
  bale: {
    label: "بله (Bale)",
    icon: MessageCircle,
    tone: "text-emerald-200",
    recipientHint: "@username یا chat_id عددی بله",
    description: "پیام‌رسان ایرانی بله؛ ارسال با Bot API رسمی (bale.ai/api). وب‌اپ در web.bale.ai در دسترس است.",
    webApp: "https://web.bale.ai/",
    homepage: "https://bale.ai/",
  },
  rubika: {
    label: "روبیکا (Rubika)",
    icon: MessageCircle,
    tone: "text-pink-300",
    recipientHint: "@username یا guid روبیکا",
    description: "پیام‌رسان روبیکا؛ ارسال با Rubika Bot API. برای استفاده انسانی از web.rubika.ir استفاده کنید.",
    webApp: "https://web.rubika.ir/",
    homepage: "https://rubika.ir/",
  },
  soroush: {
    label: "سروش پلاس",
    icon: MessageCircle,
    tone: "text-orange-300",
    recipientHint: "@username یا chat_id سروش",
    description: "سروش پلاس با Bot API رسمی (soroushplus.com). وب‌اپ در web.splus.ir در دسترس است.",
    webApp: "https://web.splus.ir/",
    homepage: "https://soroushplus.com/",
  },
  eitaa: {
    label: "ایتا (Eitaa)",
    icon: MessageCircle,
    tone: "text-yellow-300",
    recipientHint: "@username یا chat_id ایتا",
    description: "پیام‌رسان ایتا با سرویس «ایتایار» برای ارسال ماشینی. کاربر می‌تواند از eitaa.com یا web.eitaa.com دستی ارسال کند.",
    webApp: "https://web.eitaa.com/",
    homepage: "https://eitaa.com/",
  },
  "divar-chat": {
    label: "چت Divar",
    icon: MessageSquareText,
    tone: "text-rose-200",
    recipientHint: "https://divar.ir/v/آگهی-شما",
    description: "گفت‌وگو با کاربر داخل صفحه آگهی Divar. ادامه مکالمه در وب‌سایت رسمی Divar یا با API چت Divar (در صورت داشتن دسترسی رسمی).",
    webApp: "https://divar.ir/",
    homepage: "https://divar.ir/",
  },
  email: {
    label: "ایمیل (SMTP)",
    icon: Mail,
    tone: "text-violet-300",
    recipientHint: "manager@example.com",
    description: "ارسال از سرور با احراز هویت SMTP. آدرس فرستنده رسمی توصیه می‌شود.",
  },
  sms: {
    label: "پیامک (SMS Provider)",
    icon: MessageSquareText,
    tone: "text-amber-300",
    recipientHint: "989121234567",
    description: "ارسال از خط اختصاصی از طریق وبهوک تاییدشده اپراتور.",
  },
  divar: {
    label: "Divar (شریک آگهی)",
    icon: ShoppingBag,
    tone: "text-rose-300",
    recipientHint: "لینک آگهی Divar",
    description: "فقط با API شریک رسمی. در غیر این صورت متن کپی و ارسال دستی انجام می‌شود.",
    webApp: "https://divar.ir/",
    homepage: "https://divar.ir/",
  },
};

type CommsPanelProps = {
  lead: Lead;
  agency: AgencyProfile;
  channel: Channel;
  setChannel: (channel: Channel) => void;
  recipient: string;
  setRecipient: (value: string) => void;
  subject: string;
  setSubject: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  approved: boolean;
  setApproved: (value: boolean) => void;
  consent: boolean;
  setConsent: (value: boolean) => void;
  sending: boolean;
  integrations: IntegrationStatus[];
  dryRun: boolean;
  whatsappTarget: WhatsAppTarget;
  setWhatsappTarget: (target: WhatsAppTarget) => void;
  pdfBuilding: boolean;
  pdfLink: { url: string; provider: string } | null;
  onCopy: () => void;
  onWhatsApp: (target?: WhatsAppTarget) => void;
  onWhatsAppWithPdf: () => void;
  onDivar: () => void;
  onDispatch: () => void;
  onDownloadPdf: () => void;
  onSharePdf: () => void;
  onUploadPdf: () => void;
  onOpenSettings: () => void;
  channelStatus?: IntegrationStatus;
  discoveredPhones: DiscoveredPhone[];
  discovering: boolean;
  discoveryMessage: string;
  onDiscoverPhones: () => void;
  onPickPhone: (phone: DiscoveredPhone) => void;
};

function CommsPanel({
  lead,
  agency,
  channel,
  setChannel,
  recipient,
  setRecipient,
  subject,
  setSubject,
  message,
  setMessage,
  approved,
  setApproved,
  consent,
  setConsent,
  sending,
  integrations,
  dryRun,
  whatsappTarget,
  setWhatsappTarget,
  pdfBuilding,
  pdfLink,
  onCopy,
  onWhatsApp,
  onWhatsAppWithPdf,
  onDivar,
  onDispatch,
  onDownloadPdf,
  onSharePdf,
  onUploadPdf,
  onOpenSettings,
  channelStatus,
  discoveredPhones,
  discovering,
  discoveryMessage,
  onDiscoverPhones,
  onPickPhone,
}: CommsPanelProps) {
  const meta = CHANNEL_META[channel];
  const Icon = meta.icon;
  const canDispatch = approved && consent && !!recipient.trim() && !!message.trim() && !sending;
  return (
    <div className="mt-7">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.entries(CHANNEL_META) as [Channel, typeof CHANNEL_META[Channel]][]).map(([key, info]) => {
          const status = integrations.find((item) => item.channel === key);
          const StatusIcon = info.icon;
          const active = channel === key;
          return (
            <button
              key={key}
              onClick={() => setChannel(key)}
              className={`relative flex flex-col items-start gap-1 rounded-xl border p-3 text-right transition ${
                active ? "border-emerald-400/40 bg-emerald-400/[0.07]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <StatusIcon className={`h-3.5 w-3.5 ${info.tone}`} />
                <span className="text-[10px] font-black text-zinc-200">{info.label.split(" ")[0]}</span>
              </span>
              <span className={`text-[8px] font-bold ${status?.ok ? "text-emerald-300" : "text-zinc-600"}`}>
                {status?.ok ? "متصل" : key === "divar" ? "دستی" : "بدون کلید"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/[0.07] text-emerald-300">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-black">{meta.label}</h3>
          <p className="mt-1 text-[10px] leading-5 text-zinc-600">{meta.description}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-black ${
          channelStatus?.ok ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300" : "border-white/[0.08] bg-white/[0.03] text-zinc-500"
        }`}>
          {channelStatus?.ok ? <CheckCircle2 className="h-3 w-3" /> : <Key className="h-3 w-3" />}
          {channelStatus?.ok ? "کلید فعال" : "کلید تنظیم نشده"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label">گیرنده</label>
          <input
            dir="ltr"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder={meta.recipientHint}
            className="input-field mt-1.5 w-full text-left"
          />
        </div>
        {channel === "email" && (
          <div>
            <label className="field-label">موضوع ایمیل</label>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} className="input-field mt-1.5 w-full" />
          </div>
        )}
      </div>

      {(channel === "whatsapp" || channel === "sms") && (
        <div className="mt-4 rounded-2xl border border-sky-400/15 bg-sky-400/[0.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[11px] font-black text-sky-200">
                <Search className="h-3.5 w-3.5" />
                جستجوی شماره در وب‌سایت لید
              </p>
              <p className="mt-1 text-[9px] leading-5 text-zinc-500">
                استخراج امن شماره‌های تماس از صفحه اصلی وب‌سایت لید (tel:، واتس‌اپ، متن صفحه) بدون اسکراپ سایت‌های شخص ثالث.
              </p>
              {lead.website ? (
                <p dir="ltr" className="mt-1 text-[9px] font-mono text-zinc-600">{lead.website}</p>
              ) : (
                <p className="mt-1 text-[9px] text-amber-300/80">این لید وب‌سایت ندارد؛ جستجو غیرفعال است.</p>
              )}
            </div>
            <button
              onClick={onDiscoverPhones}
              disabled={discovering || !lead.website}
              className="secondary-button disabled:cursor-not-allowed disabled:opacity-35"
            >
              {discovering ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              جستجوی شماره
            </button>
          </div>

          {discoveryMessage && (
            <p className="mt-3 text-[9px] leading-5 text-zinc-500">📡 {discoveryMessage}</p>
          )}

          {discoveredPhones.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black text-zinc-400">
                  {faNumber(discoveredPhones.filter((phone) => phone.type === "mobile").length)} موبایل • {faNumber(discoveredPhones.filter((phone) => phone.type === "landline").length)} ثابت
                </p>
                <span className="text-[9px] text-zinc-600">•</span>
                <p className="text-[9px] text-zinc-500">موبایل‌ها برای واتس‌اپ استفاده می‌شوند</p>
              </div>
              <div className="space-y-2">
                {discoveredPhones.map((phone) => {
                  const digits = normalizePhone(phone.e164);
                  const rawTel = phone.e164.replace(/[^\d+]/g, "");
                  const waMobile = `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
                  const waWeb = `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
                  const baleWeb = `https://web.bale.ai/`;
                  const telHref = `tel:${rawTel}`;
                  const isMobile = phone.type === "mobile";
                  return (
                    <div
                      key={phone.e164}
                      className={`rounded-xl border p-2 ${
                        isMobile ? "border-emerald-400/25 bg-emerald-400/[0.06]" : "border-white/[0.08] bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => onPickPhone(phone)}
                          dir="ltr"
                          className={`min-w-0 flex-1 rounded-lg bg-black/25 px-2.5 py-1.5 text-left font-mono text-[11px] font-black transition hover:bg-black/40 ${
                            isMobile ? "text-emerald-100" : "text-zinc-200"
                          }`}
                          title="انتخاب این شماره برای گیرنده پیام"
                        >
                          {phone.e164}
                        </button>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-black ${
                            isMobile
                              ? "border-emerald-400/35 bg-emerald-400/[0.1] text-emerald-200"
                              : phone.type === "landline"
                                ? "border-sky-400/25 bg-sky-400/[0.08] text-sky-200"
                                : "border-white/[0.1] bg-white/[0.03] text-zinc-400"
                          }`}
                        >
                          {isMobile ? "📱 موبایل" : phone.type === "landline" ? "☎️ ثابت" : phone.type}
                        </span>
                        {phone.operator && (
                          <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-bold text-zinc-400">
                            {phone.operator}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <a
                          href={waMobile}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onPickPhone(phone)}
                          className={`small-action ${isMobile ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200" : "opacity-70"}`}
                          title={isMobile ? "باز کردن در واتس‌اپ" : "احتمال کم — این شماره ثابت است"}
                        >
                          <MessageCircle className="h-3 w-3" />
                          واتس‌اپ
                        </a>
                        <a
                          href={waWeb}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onPickPhone(phone)}
                          className="small-action"
                          title="باز کردن در web.whatsapp.com"
                        >
                          <Globe2 className="h-3 w-3" />
                          Web
                        </a>
                        <a
                          href={baleWeb}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => { onPickPhone(phone); navigator.clipboard?.writeText(digits); }}
                          className="small-action border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100"
                          title="web.bale.ai — شماره در کلیپ‌بورد کپی شد"
                        >
                          <MessageCircle className="h-3 w-3" />
                          بله
                        </a>
                        <a
                          href={telHref}
                          onClick={() => onPickPhone(phone)}
                          className="small-action border-sky-400/25 bg-sky-400/[0.08] text-sky-200"
                          title="تماس مستقیم"
                        >
                          <Phone className="h-3 w-3" />
                          تماس
                        </a>
                      </div>
                      {(phone.sources.length > 0 || phone.pages.length > 0) && (
                        <p className="mt-2 text-[9px] leading-5 text-zinc-600">
                          {phone.sources.length > 0 && <>منبع: <span dir="ltr" className="font-mono">{phone.sources.join(", ")}</span></>}
                          {phone.pages.length > 0 && <> — صفحه: <span dir="ltr" className="font-mono">{phone.pages.join(", ")}</span></>}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {discoveredPhones.filter((phone) => phone.type === "mobile").length === 0 && lead.website && (
                <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3">
                  <p className="text-[10px] font-black text-amber-200">شماره‌ی موبایل مستقیم روی سایت پیدا نشد</p>
                  <p className="mt-1 text-[9px] leading-5 text-zinc-500">
                    برای واتس‌اپ نیاز به شماره‌ی موبایل داریم. با یک کلیک در گوگل/DuckDuckGo جستجو کنید:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(() => {
                      const domain = lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");
                      const nameQuery = encodeURIComponent(`"${lead.name}" شماره موبایل واتساپ`);
                      const siteQuery = encodeURIComponent(`site:${domain} "09" OR whatsapp OR واتساپ`);
                      const ddgQuery = encodeURIComponent(`${lead.name} تماس واتساپ`);
                      const bingQuery = encodeURIComponent(`${lead.name} whatsapp 09`);
                      return (
                        <>
                          <a href={`https://www.google.com/search?q=${nameQuery}`} target="_blank" rel="noopener noreferrer" className="small-action">
                            <Search className="h-3 w-3" />
                            Google + نام
                          </a>
                          <a href={`https://www.google.com/search?q=${siteQuery}`} target="_blank" rel="noopener noreferrer" className="small-action">
                            <Search className="h-3 w-3" />
                            site:{domain}
                          </a>
                          <a href={`https://duckduckgo.com/?q=${ddgQuery}`} target="_blank" rel="noopener noreferrer" className="small-action">
                            <Search className="h-3 w-3" />
                            DuckDuckGo
                          </a>
                          <a href={`https://www.bing.com/search?q=${bingQuery}`} target="_blank" rel="noopener noreferrer" className="small-action">
                            <Search className="h-3 w-3" />
                            Bing
                          </a>
                          <a href={`https://www.instagram.com/explore/tags/${encodeURIComponent(lead.name.replace(/\s+/g, ""))}`} target="_blank" rel="noopener noreferrer" className="small-action border-pink-400/25 bg-pink-400/[0.06] text-pink-200">
                            <Camera className="h-3 w-3" />
                            اینستاگرام
                          </a>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[9px] leading-5 text-zinc-500">
                🛡️ برای هر ارسال، تایید انسانی و رضایت مخاطب لازم است. Bale هنوز API عمومی open-chat ندارد؛ کلید روی web.bale.ai باز می‌شود و شماره در کلیپ‌بورد شما کپی می‌شود تا مخاطب را پیدا کنید.
              </p>
            </div>
          )}
        </div>
      )}

      <label className="field-label mt-4 block">متن پیام (قابل ویرایش)</label>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className="input-field mt-1.5 min-h-52 w-full resize-none whitespace-pre-wrap text-[11px] leading-7"
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.035] p-3">
          <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} className="mt-1 accent-emerald-400" />
          <span>
            <strong className="block text-[11px] font-black text-amber-100">تایید انسانی</strong>
            <span className="mt-1 block text-[9px] leading-5 text-zinc-600">متن و مخاطب را دیده‌ام و اجازه می‌دهم ارسال شود.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-400/15 bg-sky-400/[0.03] p-3">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-sky-400" />
          <span>
            <strong className="block text-[11px] font-black text-sky-200">رضایت مخاطب</strong>
            <span className="mt-1 block text-[9px] leading-5 text-zinc-600">این کسب‌وکار برای دریافت پیام رضایت داده است.</span>
          </span>
        </label>
      </div>

      {dryRun && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-zinc-500/15 bg-zinc-500/[0.04] p-3 text-[10px] leading-5 text-zinc-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
          حالت Dry Run فعال است. پیام واقعی ارسال نمی‌شود؛ فقط در گزارش ثبت می‌شود. برای ارسال واقعی، در تنظیمات آن را خاموش کنید و کلیدهای کانال را پیکربندی کنید.
        </p>
      )}

      {channel === "whatsapp" && (
        <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.03] p-4">
          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-200">
            <MessageCircle className="h-3.5 w-3.5" />
            مقصد باز کردن واتس‌اپ
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {([
              ["auto", "خودکار", isMobileDevice() ? "بر اساس دستگاه: موبایل" : "بر اساس دستگاه: دسکتاپ"],
              ["mobile", "اپ موبایل", "api.whatsapp.com"],
              ["desktop", "اپ دسکتاپ", "whatsapp://"],
              ["web", "وب واتس‌اپ", "web.whatsapp.com"],
            ] as const).map(([key, label, hint]) => (
              <button
                key={key}
                onClick={() => setWhatsappTarget(key)}
                className={`rounded-xl border p-2 text-right transition ${
                  whatsappTarget === key ? "border-emerald-400/40 bg-emerald-400/[0.08] text-emerald-200" : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:border-white/15"
                }`}
              >
                <p className="text-[10px] font-black">{label}</p>
                <p dir="ltr" className="mt-0.5 text-[8px] font-mono text-zinc-600">{hint}</p>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button onClick={() => onWhatsApp("mobile")} disabled={!approved || !recipient} className="small-action justify-center disabled:cursor-not-allowed disabled:opacity-35"><MessageCircle className="h-3.5 w-3.5" />موبایل</button>
            <button onClick={() => onWhatsApp("desktop")} disabled={!approved || !recipient} className="small-action justify-center disabled:cursor-not-allowed disabled:opacity-35"><MessageCircle className="h-3.5 w-3.5" />دسکتاپ</button>
            <button onClick={() => onWhatsApp("web")} disabled={!approved || !recipient} className="small-action justify-center disabled:cursor-not-allowed disabled:opacity-35"><MessageCircle className="h-3.5 w-3.5" />وب / Chrome</button>
            <button
              onClick={onWhatsAppWithPdf}
              disabled={!approved || !recipient || pdfBuilding}
              className="small-action justify-center border-violet-400/25 bg-violet-400/[0.08] text-violet-200 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {pdfBuilding ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <FileCheck2 className="h-3.5 w-3.5" />}
              همراه PDF
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-violet-400/15 bg-violet-400/[0.03] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[11px] font-black text-violet-200"><FileCheck2 className="h-3.5 w-3.5" />پیشنهاد PDF با لوگو {agency.name}</p>
            <p className="mt-1 text-[9px] leading-5 text-zinc-500">
              فایل PDF شامل امتیاز ممیزی، نقشه راه و اطلاعات تماس رسمی است. برای ارسال در واتس‌اپ، ابتدا لینک عمومی PDF را بسازید تا در متن پیام درج شود.
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button onClick={onDownloadPdf} disabled={pdfBuilding} className="secondary-button justify-center disabled:cursor-not-allowed disabled:opacity-35">
            {pdfBuilding ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            دانلود PDF
          </button>
          <button onClick={onSharePdf} disabled={pdfBuilding} className="secondary-button justify-center disabled:cursor-not-allowed disabled:opacity-35">
            <Send className="h-4 w-4" />
            اشتراک‌گذاری فایل
          </button>
          <button onClick={onUploadPdf} disabled={pdfBuilding} className="primary-button justify-center disabled:cursor-not-allowed disabled:opacity-35">
            {pdfBuilding ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            بارگذاری و درج لینک
          </button>
        </div>
        {pdfLink && (
          <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3">
            <p className="flex items-center gap-2 text-[10px] font-black text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              لینک عمومی PDF آماده است ({pdfLink.provider})
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a dir="ltr" href={pdfLink.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate rounded-lg bg-black/30 px-2 py-1.5 text-[10px] font-mono text-emerald-100">
                {pdfLink.url}
              </a>
              <button onClick={() => { navigator.clipboard.writeText(pdfLink.url); }} className="data-button">کپی</button>
            </div>
          </div>
        )}
      </div>

      {(meta.webApp || meta.homepage) && (
        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[10px] font-black text-zinc-300"><Link2 className="h-3.5 w-3.5 text-emerald-300" />باز کردن پیام‌رسان</p>
            <div className="flex flex-wrap gap-2">
              {meta.webApp && (
                <a href={meta.webApp} target="_blank" rel="noopener noreferrer" className="small-action"><Globe2 className="h-3.5 w-3.5" />وب‌اپ</a>
              )}
              {meta.homepage && (
                <a href={meta.homepage} target="_blank" rel="noopener noreferrer" className="small-action"><Link2 className="h-3.5 w-3.5" />سایت رسمی</a>
              )}
            </div>
          </div>
          <p dir="ltr" className="mt-2 text-[9px] font-mono text-zinc-600">
            {meta.webApp || ""} {meta.homepage ? `• ${meta.homepage}` : ""}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button onClick={onOpenSettings} className="secondary-button"><Settings2 className="h-4 w-4" />کلیدها</button>
        <button onClick={onCopy} disabled={!approved} className="secondary-button disabled:cursor-not-allowed disabled:opacity-35"><Copy className="h-4 w-4" />کپی متن</button>
        {channel === "divar" && (
          <button onClick={onDivar} disabled={!approved} className="secondary-button disabled:cursor-not-allowed disabled:opacity-35"><Link2 className="h-4 w-4" />باز کردن Divar</button>
        )}
        <button onClick={onDispatch} disabled={!canDispatch} className="primary-button disabled:cursor-not-allowed disabled:opacity-35">
          {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {dryRun ? "ثبت آزمایشی" : (channel === "divar" || channel === "divar-chat" || channel === "eitaa") && !(channelStatus?.ok) ? "کپی و ارسال دستی" : "ارسال از سرور"}
        </button>
      </div>

      <p className="mt-3 text-[9px] leading-5 text-zinc-600">
        سرنخ: {lead.name} • شماره ذخیره‌شده: {lead.phone ? <span dir="ltr">{lead.phone}</span> : "ثبت نشده"} • ارسال‌کننده: {agency.name}
      </p>
    </div>
  );
}

function Landing({ navigate, integrations, agency }: { navigate: (view: View) => void; integrations: IntegrationStatus[]; agency: AgencyProfile }) {
  const readyCount = integrations.filter((item) => item.ok).length;
  const features = [
    { icon: Radar, title: "ممیزی زنده وب‌سایت", desc: "بررسی HTTPS، عنوان، H1، Canonical، Schema، robots و sitemap با محافظت SSRF." },
    { icon: Target, title: "امتیازدهی و اولویت", desc: "لیدها به‌صورت خودکار در سه سطح P1 تا P3 دسته‌بندی می‌شوند." },
    { icon: Megaphone, title: "پنج کانال ارتباطی", desc: "WhatsApp Business، Telegram، Email، SMS و Divar در یک پنل تاییدشده." },
    { icon: ShieldCheck, title: "امن و مسئولانه", desc: "تایید انسانی، رضایت مخاطب، حد ارسال، لاگ هش‌شده و حالت Dry Run پیش‌فرض." },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="mx-auto max-w-4xl pt-14 pb-16 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-1.5 text-[10px] font-black text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          لیدفِر • عملیات فروش سئو با کنترل انسانی
        </span>
        <h1 className="mt-6 text-3xl font-black leading-[1.4] tracking-tight sm:text-6xl sm:leading-[1.25]">
          <span className="shimmer-text">لیدفِر</span> فرصت‌های واقعی گوگل را<br className="hidden sm:block" /> به قرارداد تبدیل می‌کند
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-zinc-400 sm:text-base">
          از شکار لید و ممیزی تا ارسال چندکاناله؛ همه در یک محیط RTL، با تایید انسانی، رعایت رضایت مخاطب، محدودیت نرخ و لاگ‌های هش‌شده.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => navigate("dashboard")} className="primary-button min-w-52 justify-center"><Crosshair className="h-4 w-4" />ورود به مرکز عملیات</button>
          <button onClick={() => navigate("settings")} className="secondary-button"><Settings2 className="h-4 w-4" />پیکربندی کانال‌ها</button>
        </div>
        <p className="mt-5 text-[10px] font-bold text-zinc-500">
          {faNumber(readyCount)} از ۵ کانال ارتباطی فعال است • حالت Dry Run به‌صورت پیش‌فرض روشن است
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + index * 0.05 }}
            className="glass-panel rounded-2xl p-5"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/[0.07] text-emerald-300"><feature.icon className="h-5 w-5" /></span>
            <h3 className="mt-4 text-sm font-black">{feature.title}</h3>
            <p className="mt-2 text-[11px] leading-6 text-zinc-500">{feature.desc}</p>
          </motion.article>
        ))}
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <h2 className="text-lg font-black">جریان کار</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["۱. ورود لیدها", "دستی، وارد کردن CSV، یا استخراج از HTML صفحه نمایشگاه."],
              ["۲. ممیزی و امتیاز", "ممیزی امن /api/audit با محافظت DNS/SSL/redirect و امتیاز فنی صفحه اصلی."],
              ["۳. تولید متن", "متن شخصی‌سازی‌شده برای هر کانال؛ قابل ویرایش و تایید."],
              ["۴. ارسال کنترل‌شده", "ارسال فقط با تایید انسانی و رضایت مخاطب؛ لاگ هش‌شده."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs font-black text-emerald-300">{title}</p>
                <p className="mt-2 text-[11px] leading-6 text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="glass-panel rounded-3xl p-6">
          <h3 className="flex items-center gap-2 text-sm font-black"><Link2 className="h-4 w-4 text-emerald-300" />کانال‌های ارتباطی</h3>
          <ul className="mt-4 space-y-3">
            {integrations.map((item) => (
              <li key={item.channel} className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div>
                  <p className="text-[11px] font-black">{item.label}</p>
                  <p className="mt-1 text-[9px] leading-5 text-zinc-600">{item.note}</p>
                </div>
                <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-black ${item.ok ? "border-emerald-400/25 text-emerald-300" : "border-white/[0.08] text-zinc-500"}`}>
                  {item.ok ? "متصل" : "نیازمند کلید"}
                </span>
              </li>
            ))}
          </ul>
          <button onClick={() => navigate("settings")} className="secondary-button mt-5 w-full justify-center"><Settings2 className="h-4 w-4" />رفتن به تنظیمات</button>
        </aside>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            {agency.logoDataUrl ? (
              <img src={agency.logoDataUrl} alt={agency.name} className="h-14 w-14 rounded-2xl border border-white/[0.08] object-cover" />
            ) : (
              <BrandMark />
            )}
            <div className="flex-1">
              <p className="text-[10px] font-black text-emerald-400">شرکت پیش‌فرض ارسال‌کننده</p>
              <h3 className="mt-1 text-lg font-black">{agency.name}</h3>
            </div>
            <button onClick={() => navigate("settings")} className="secondary-button"><Settings2 className="h-4 w-4" />ویرایش پروفایل</button>
          </div>
          <p className="mt-4 text-[11px] leading-7 text-zinc-400">{agency.intro}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <p dir="ltr" className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-zinc-400"><Phone className="mb-1 inline h-3 w-3 text-emerald-300" /> {agency.phone}</p>
            <p dir="ltr" className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-zinc-400"><Globe2 className="mb-1 inline h-3 w-3 text-sky-300" /> {agency.website}</p>
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-zinc-400"><Timer className="mb-1 inline h-3 w-3 text-amber-300" /> {agency.hours}</p>
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-zinc-400"><Building2 className="mb-1 inline h-3 w-3 text-violet-300" /> {agency.address}</p>
          </div>
        </div>

        <aside className="glass-panel rounded-3xl p-5">
          <p className="text-[10px] font-black text-emerald-300">رقبای این حوزه در داشبورد</p>
          <ul className="mt-4 space-y-3">
            {seedCompetitors.map((company) => (
              <li key={company.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black">{company.name}</p>
                  <span className={`priority-badge priority-${getPriority(company).toLowerCase()}`}>{getPriority(company)}</span>
                </div>
                <p dir="ltr" className="mt-1 text-[9px] font-mono text-zinc-500">{company.website?.replace(/^https?:\/\//, "")}</p>
                <p className="mt-1 text-[9px] text-zinc-600">امتیاز فنی: {faNumber(company.score ?? 0)} • رتبه گوگل: {company.googleRank ? faNumber(company.googleRank) : "—"}</p>
              </li>
            ))}
          </ul>
          <button onClick={() => navigate("dashboard")} className="primary-button mt-5 w-full justify-center"><Crosshair className="h-4 w-4" />ورود به داشبورد</button>
        </aside>
      </section>

      <section className="mt-14 rounded-3xl border border-amber-400/15 bg-amber-400/[0.03] p-6 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-amber-300" />
        <h3 className="mt-4 text-base font-black">اصول اخلاقی و انطباق</h3>
        <p className="mx-auto mt-3 max-w-2xl text-[11px] leading-6 text-zinc-500">
          ارسال انبوه فقط با رضایت مخاطب، تایید انسانی، محدودیت نرخ و کلیدهای سمت سرور فعال می‌شود. Divar بدون API رسمی هرگز اسکراپ نمی‌شود؛ متن آماده کپی است و ارسال به‌صورت دستی انجام می‌شود.
        </p>
      </section>
    </motion.div>
  );
}

function SettingsView({
  integrations,
  dryRun,
  setDryRun,
  sendLogs,
  onClear,
  onBack,
  agency,
  setAgency,
}: {
  integrations: IntegrationStatus[];
  dryRun: boolean;
  setDryRun: (value: boolean) => void;
  sendLogs: SendLogEntry[];
  onClear: () => void;
  onBack: () => void;
  agency: AgencyProfile;
  setAgency: (agency: AgencyProfile) => void;
}) {
  const [draft, setDraft] = useState<AgencyProfile>(agency);
  useEffect(() => setDraft(agency), [agency]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      alert("حجم فایل باید کمتر از ۵۰۰ کیلوبایت باشد.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, logoDataUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };
  const envMap: Record<Channel, string[]> = {
    whatsapp: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"],
    telegram: ["TELEGRAM_BOT_TOKEN"],
    bale: ["BALE_BOT_TOKEN"],
    rubika: ["RUBIKA_BOT_TOKEN"],
    soroush: ["SOROUSH_BOT_TOKEN"],
    eitaa: ["EITAA_TOKEN"],
    "divar-chat": ["DIVAR_CHAT_TOKEN"],
    email: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"],
    sms: ["SMS_WEBHOOK_URL", "SMS_API_KEY"],
    divar: ["DIVAR_PARTNER_URL", "DIVAR_API_KEY"],
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-12 sm:pt-16">
      <section className="max-w-3xl">
        <p className="flex items-center gap-2 text-xs font-black text-emerald-400"><Settings2 className="h-4 w-4" />تنظیمات ارسال و انطباق</p>
        <h1 className="mt-4 text-3xl font-black leading-[1.4] sm:text-5xl">پیکربندی امن کانال‌های ارتباطی</h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-zinc-500">همه کلیدها فقط در سمت سرور نگهداری می‌شوند. این صفحه وضعیت اتصال، محدودیت‌ها و لاگ‌های هش‌شده ارسال را نمایش می‌دهد.</p>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {draft.logoDataUrl ? (
                  <img src={draft.logoDataUrl} alt="لوگو" className="h-14 w-14 rounded-xl border border-white/[0.08] object-cover" />
                ) : (
                  <span className="grid h-14 w-14 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-500"><ShieldCheck className="h-5 w-5" /></span>
                )}
                <div>
                  <p className="text-xs font-black">پروفایل شرکت ارسال‌کننده</p>
                  <p className="mt-1 text-[10px] leading-5 text-zinc-500">این اطلاعات در پیام‌ها و PDF پیشنهاد قرار می‌گیرد.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="secondary-button cursor-pointer">
                  <Upload className="h-4 w-4" />
                  آپلود لوگو
                  <input type="file" accept="image/png,image/jpeg" onChange={handleLogoUpload} className="hidden" />
                </label>
                <button onClick={() => { setDraft(DEFAULT_AGENCY); setAgency(DEFAULT_AGENCY); }} className="secondary-button"><RefreshCw className="h-4 w-4" />بازیابی SEOF</button>
                <button onClick={() => setAgency(draft)} className="primary-button"><Check className="h-4 w-4" />ذخیره پروفایل</button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label">نام کسب‌وکار</label>
                <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="input-field mt-1.5 w-full" />
              </div>
              <div>
                <label className="field-label">شماره تماس</label>
                <input dir="ltr" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="input-field mt-1.5 w-full text-left" />
              </div>
              <div>
                <label className="field-label">وب‌سایت</label>
                <input dir="ltr" value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })} className="input-field mt-1.5 w-full text-left" />
              </div>
              <div>
                <label className="field-label">ساعت کاری</label>
                <input value={draft.hours} onChange={(event) => setDraft({ ...draft, hours: event.target.value })} className="input-field mt-1.5 w-full" />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label">نشانی دفتر</label>
                <input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} className="input-field mt-1.5 w-full" />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label">معرفی کوتاه</label>
                <textarea value={draft.intro} onChange={(event) => setDraft({ ...draft, intro: event.target.value })} className="input-field mt-1.5 min-h-24 w-full resize-none leading-6" />
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black">حالت Dry Run</p>
                <p className="mt-1 text-[10px] leading-5 text-zinc-500">اگر فعال باشد، پیام‌ها فقط ثبت می‌شوند و به مخاطب واقعی ارسال نمی‌شوند.</p>
              </div>
              <button
                onClick={() => setDryRun(!dryRun)}
                className={`inline-flex h-8 w-14 items-center rounded-full border transition ${dryRun ? "border-emerald-400/40 bg-emerald-400/[0.15]" : "border-white/[0.1] bg-white/[0.04]"}`}
                aria-pressed={dryRun}
              >
                <span className={`h-6 w-6 rounded-full bg-white transition ${dryRun ? "translate-x-1" : "translate-x-7"}`} />
              </button>
            </div>
          </div>

          <div className="glass-panel overflow-hidden rounded-2xl">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <p className="text-xs font-black">وضعیت کانال‌های ارتباطی</p>
              <p className="mt-1 text-[10px] leading-5 text-zinc-600">در Vercel، مقدارها با متغیرهای محیطی خوانده می‌شوند. در پیش‌نمایش محلی، این وضعیت نمایشی است.</p>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {integrations.map((item) => {
                const Icon = CHANNEL_META[item.channel].icon;
                return (
                  <div key={item.channel} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04]"><Icon className={`h-5 w-5 ${CHANNEL_META[item.channel].tone}`} /></span>
                      <div>
                        <p className="text-xs font-black">{item.label}</p>
                        <p className="mt-1 text-[10px] leading-5 text-zinc-500">{item.note}</p>
                        <p className="mt-1.5 flex flex-wrap gap-1 text-[9px] font-mono text-zinc-600">
                          {envMap[item.channel].map((key) => (
                            <span key={key} className="rounded-md border border-white/[0.06] px-1.5 py-0.5">{key}</span>
                          ))}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-black ${item.ok ? "border-emerald-400/30 text-emerald-300" : "border-white/[0.08] text-zinc-500"}`}>
                      {item.ok ? "متصل" : "نیازمند کلید"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-sky-400/15 bg-sky-400/[0.04] p-5">
            <p className="text-xs font-black text-sky-200">حد ارسال</p>
            <p className="mt-2 text-[11px] leading-6 text-zinc-500">
              حداکثر ۲۰ پیام در دقیقه در سمت کلاینت اعمال می‌شود. توصیه می‌شود در سمت سرور نیز حد و صف کاری پایدار (مثل Redis / Cloudflare Queues) پیاده‌سازی شود.
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="glass-panel overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
              <p className="text-xs font-black flex items-center gap-2"><Timer className="h-4 w-4 text-emerald-300" />لاگ‌های ارسال</p>
              <button onClick={onClear} className="data-button">پاک‌سازی</button>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-white/[0.05]">
              {sendLogs.length === 0 ? (
                <p className="p-4 text-[10px] text-zinc-600">هنوز ارسالی ثبت نشده است.</p>
              ) : (
                sendLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black">{log.leadName}</span>
                      <span className={`text-[9px] font-black ${
                        log.status === "sent" ? "text-emerald-300" :
                        log.status === "dry-run" ? "text-sky-300" :
                        log.status === "manual" ? "text-amber-300" :
                        log.status === "failed" ? "text-rose-300" : "text-zinc-400"
                      }`}>{log.status}</span>
                    </div>
                    <p className="mt-1 text-[9px] leading-5 text-zinc-500">
                      {log.channel} • مخاطب: <span dir="ltr" className="font-mono">{log.recipientHash}</span>
                    </p>
                    {log.detail && <p className="mt-1 text-[9px] text-zinc-600">{log.detail}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
          <button onClick={onBack} className="secondary-button w-full justify-center"><Crosshair className="h-4 w-4" />بازگشت به مرکز عملیات</button>
        </aside>
      </div>
    </motion.div>
  );
}

const SEARCH_PRESETS: { key: string; label: string; query: string; sector: string }[] = [
  { key: "cosmetic", label: "کلینیک زیبایی", query: "کلینیک زیبایی و پوست تهران", sector: "کلینیک زیبایی" },
  { key: "sex", label: "کلینیک تخصصی زناشویی", query: "کلینیک تخصصی زناشویی و سلامت جنسی تهران", sector: "کلینیک سلامت جنسی" },
  { key: "dental", label: "کلینیک دندان‌پزشکی", query: "کلینیک دندان‌پزشکی تهران", sector: "دندان‌پزشکی" },
  { key: "dermatology", label: "کلینیک پوست و مو", query: "کلینیک پوست و مو تهران", sector: "پوست و مو" },
  { key: "gyneco", label: "کلینیک زنان و مامایی", query: "کلینیک زنان و مامایی تهران", sector: "زنان و مامایی" },
  { key: "physio", label: "کلینیک فیزیوتراپی", query: "کلینیک فیزیوتراپی تهران", sector: "فیزیوتراپی" },
  { key: "psych", label: "کلینیک روان‌شناسی", query: "کلینیک روان‌شناسی و مشاوره تهران", sector: "روان‌شناسی" },
  { key: "ortho", label: "کلینیک ارتوپدی", query: "کلینیک ارتوپدی و آسیب‌های ورزشی تهران", sector: "ارتوپدی" },
  { key: "eye", label: "کلینیک چشم‌پزشکی", query: "کلینیک چشم‌پزشکی و لیزیک تهران", sector: "چشم‌پزشکی" },
  { key: "diet", label: "کلینیک تغذیه", query: "کلینیک تغذیه و رژیم‌درمانی تهران", sector: "تغذیه و رژیم" },
  { key: "fertility", label: "کلینیک ناباروری", query: "کلینیک ناباروری IVF تهران", sector: "ناباروری" },
  { key: "seo", label: "آژانس‌های سئو رقیب", query: "آژانس سئو تهران site:.ir", sector: "آژانس سئو" },
];

type DiscoverResult = { url: string; title: string; source: string; host: string };

function DiscoverLeadsModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (companies: ImportedCompany[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("خدمات پزشکی");
  const [engines, setEngines] = useState<string[]>(["duckduckgo", "bing", "brave"]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoverResult[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setError("");
      setResults([]);
      setSelected(new Set());
    }
  }, [open]);

  const toggleEngine = (name: string) => {
    setEngines((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  };

  const runSearch = async (overrideQuery?: string, overrideSector?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) {
      setError("عبارت جستجو الزامی است.");
      return;
    }
    if (overrideSector) setSector(overrideSector);
    if (overrideQuery) setQuery(overrideQuery);
    setLoading(true);
    setError("");
    try {
      const engineParam = engines.length ? `&engines=${engines.join(",")}` : "";
      const response = await fetch(`/api/discover-leads?q=${encodeURIComponent(q)}${engineParam}&limit=20`);
      const data = (await response.json()) as { results?: DiscoverResult[]; message?: string; error?: string };
      if (data.error) throw new Error(data.error);
      const rows = data.results ?? [];
      setResults(rows);
      setSelected(new Set(rows.map((row) => row.url)));
      if (!rows.length) setError(data.message || "نتیجه‌ای پیدا نشد.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "جستجو ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (url: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const importSelected = () => {
    const chosen = results.filter((row) => selected.has(row.url));
    if (!chosen.length) {
      setError("حداقل یک نتیجه را انتخاب کنید.");
      return;
    }
    const companies: ImportedCompany[] = chosen.map((row) => ({
      name: row.title || row.host,
      website: row.url,
      phone: null,
    }));
    // Sector info is applied inside the lead by tagging via name+sector; importCompanies already sets a default sector.
    // Pass through so the caller decides the shape.
    onImport(companies);
    setResults([]);
    setSelected(new Set());
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[78] grid place-items-center px-3 py-6 sm:px-4 sm:py-8">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label="بستن"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            className="glass-panel relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-5">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-black text-emerald-400">
                  <Search className="h-3.5 w-3.5" />
                  کشف لید از موتور جستجو
                </p>
                <h2 className="mt-1 text-lg font-black">جستجوی چندموتوره کسب‌وکارها</h2>
                <p className="mt-1 text-[10px] leading-5 text-zinc-500">
                  ترکیب DuckDuckGo، Bing و Brave. سایت‌های شبکه اجتماعی و فروم‌ها به‌طور خودکار حذف می‌شوند.
                </p>
              </div>
              <button onClick={onClose} className="icon-button" aria-label="بستن"><X className="h-4 w-4" /></button>
            </div>

            <div className="border-b border-white/[0.06] p-5">
              <label className="field-label">کلمه کلیدی جستجو</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }}
                  placeholder="مثلا: کلینیک تخصصی زناشویی تهران"
                  className="input-field min-w-0 flex-1"
                />
                <input
                  value={sector}
                  onChange={(event) => setSector(event.target.value)}
                  placeholder="حوزه فعالیت"
                  className="input-field w-full sm:w-40"
                />
                <button onClick={() => runSearch()} disabled={loading} className="primary-button min-w-32 justify-center disabled:cursor-not-allowed disabled:opacity-35">
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  جستجو
                </button>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-black text-zinc-500">پیش‌فرض‌های سریع</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SEARCH_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => runSearch(preset.query, preset.sector)}
                      disabled={loading}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-black text-zinc-300 transition hover:border-emerald-400/30 hover:text-emerald-200 disabled:opacity-40"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-black text-zinc-500">موتورهای جستجو</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    ["duckduckgo", "DuckDuckGo"],
                    ["bing", "Bing"],
                    ["brave", "Brave"],
                  ].map(([key, label]) => {
                    const active = engines.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleEngine(key)}
                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-black transition ${
                          active ? "border-emerald-400/35 bg-emerald-400/[0.08] text-emerald-200" : "border-white/[0.08] bg-white/[0.02] text-zinc-500"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {error && !loading && (
                <p className="rounded-lg border border-rose-400/20 bg-rose-400/[0.05] p-3 text-[11px] font-bold text-rose-300">{error}</p>
              )}
              {loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-500">
                  <LoaderCircle className="h-8 w-8 animate-spin text-emerald-300" />
                  <p className="text-[11px] font-black">در حال جستجو در {faNumber(engines.length)} موتور...</p>
                </div>
              )}
              {!loading && !error && results.length === 0 && (
                <div className="empty-state">
                  <Telescope className="h-8 w-8 text-emerald-300" />
                  <p className="mt-3 text-xs font-black text-zinc-400">هنوز جستجو نکرده‌اید</p>
                  <p className="mt-2 max-w-md text-center text-[10px] leading-5 text-zinc-500">
                    یک عبارت وارد کنید یا از پیش‌فرض‌ها استفاده کنید. برای هر کسب‌وکاری که نتیجه بگیرد، وب‌سایت به لیدها اضافه می‌شود و می‌توانید ممیزی سئو را روی آن اجرا کنید.
                  </p>
                </div>
              )}
              {!loading && results.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black text-zinc-500">
                    <span>{faNumber(results.length)} نتیجه — {faNumber(selected.size)} انتخاب‌شده</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => setSelected(new Set(results.map((row) => row.url)))} className="data-button">همه</button>
                      <button onClick={() => setSelected(new Set())} className="data-button">هیچکدام</button>
                    </div>
                  </div>
                  {results.map((row) => {
                    const active = selected.has(row.url);
                    return (
                      <div
                        key={row.url}
                        className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                          active ? "border-emerald-400/25 bg-emerald-400/[0.05]" : "border-white/[0.07] bg-white/[0.02]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleSelect(row.url)}
                          className="mt-1.5 accent-emerald-400"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-black text-zinc-100">{row.title || row.host}</p>
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            dir="ltr"
                            className="mt-1 block truncate text-[10px] font-mono text-emerald-300 hover:underline"
                          >
                            {row.url}
                          </a>
                          <p className="mt-1 text-[9px] text-zinc-600">منبع: {row.source}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] p-4">
              <p className="text-[10px] leading-5 text-zinc-500">
                🛡️ نتایج مستقیماً ذخیره نمی‌شوند؛ فقط وب‌سایت و عنوان به‌عنوان لید ثبت می‌شود. برای هر ارسال بعدی همچنان تایید انسانی و رضایت مخاطب لازم است.
              </p>
              <button
                onClick={importSelected}
                disabled={!results.length}
                className="primary-button min-w-40 justify-center disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Plus className="h-4 w-4" />
                افزودن {faNumber(selected.size)} لید
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function AddLeadModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: { name: string; sector: string; website: string | null; phone: string | null }) => void;
}) {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setSector("");
      setWebsite("");
      setPhone("");
      setError("");
    }
  }, [open]);

  const submit = () => {
    if (!name.trim()) {
      setError("نام کسب‌وکار الزامی است.");
      return;
    }
    let normalized: string | null = null;
    const raw = website.trim();
    if (raw) {
      normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      try {
        new URL(normalized);
      } catch {
        setError("آدرس وب‌سایت واردشده معتبر نیست.");
        return;
      }
    }
    onAdd({ name: name.trim(), sector: sector.trim(), website: normalized, phone: phone.trim() || null });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[78] grid place-items-center px-4 py-8">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label="بستن"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            className="glass-panel relative z-10 w-full max-w-md rounded-3xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-400">افزودن سریع لید</p>
                <h2 className="mt-1 text-lg font-black">لید تازه</h2>
              </div>
              <button onClick={onClose} className="icon-button" aria-label="بستن">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="field-label">نام کسب‌وکار</label>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثلا کلینیک سلامت آفتاب" className="input-field mt-1.5 w-full" />
              </div>
              <div>
                <label className="field-label">حوزه فعالیت</label>
                <input value={sector} onChange={(event) => setSector(event.target.value)} placeholder="مثلا خدمات پزشکی" className="input-field mt-1.5 w-full" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">وب‌سایت (اختیاری)</label>
                  <input value={website} onChange={(event) => setWebsite(event.target.value)} dir="ltr" placeholder="example.ir" className="input-field mt-1.5 w-full text-left" />
                </div>
                <div>
                  <label className="field-label">تلفن (اختیاری)</label>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} dir="ltr" placeholder="021-12345678" className="input-field mt-1.5 w-full text-left" />
                </div>
              </div>
              {error && <p className="text-[11px] font-bold text-rose-300">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={onClose} className="secondary-button">انصراف</button>
              <button onClick={submit} className="primary-button"><Plus className="h-4 w-4" />ثبت لید</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Footer({ navigate }: { navigate: (view: View) => void }) {
  return (
    <footer className="relative z-10 border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-8 text-center sm:flex-row sm:text-right lg:px-10">
        <div className="flex items-center gap-3"><BrandMark /><div><strong className="text-sm font-black">لیدفِر</strong><p className="mt-1 text-[9px] text-zinc-600">شکار فرصت، ساخت پیشنهاد، رشد فروش</p></div></div>
        <div className="flex items-center gap-5 text-[10px] font-bold text-zinc-600">
          <button onClick={() => navigate("dashboard")} className="hover:text-zinc-300">شکار لید</button>
          <button onClick={() => navigate("bids")} className="hover:text-zinc-300">بازار پیشنهادها</button>
          <button onClick={() => navigate("compare")} className="hover:text-zinc-300">مقایسه بازار</button>
        </div>
        <span dir="ltr" className="text-[9px] text-zinc-700">Leadfar © 2026</span>
      </div>
    </footer>
  );
}