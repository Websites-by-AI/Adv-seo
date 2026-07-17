import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Globe2,
  KeyRound,
  Link2,
  MapPin,
  MousePointerClick,
  Palette,
  PenLine,
  Phone,
  Radar,
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  Route,
  Satellite,
  SearchCheck,
  Smartphone,
  Target,
  Trophy,
  Type,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AnalyzeButton from "@/components/AnalyzeButton";
import StageSelect from "@/components/StageSelect";
import CopyButton from "@/components/CopyButton";
import PrintButton from "@/components/PrintButton";
import { Reveal, ScoreRing } from "@/components/motion";
import { getLeadById } from "@/lib/queries";
import { buildOutreach } from "@/lib/outreach";
import { faInt, faNum, toneColor, scoreTone, cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";

export const dynamic = "force-dynamic";

const PRIORITY_CLS: Record<string, string> = {
  بالا: "border-rose-450/30 bg-rose-450/10 text-rose-450",
  متوسط: "border-gold-400/30 bg-gold-400/10 text-gold-300",
  کم: "border-line bg-white/5 text-fog-300",
};

const SEVERITY_CLS: Record<Severity, { bar: string; text: string; label: string }> = {
  high: { bar: "bg-rose-450", text: "text-rose-450", label: "بحرانی" },
  medium: { bar: "bg-gold-400", text: "text-gold-300", label: "مهم" },
  low: { bar: "bg-fog-500", text: "text-fog-300", label: "کم‌اهمیت" },
};

const CAT_ICON: Record<string, typeof Wrench> = {
  "سئو فنی": Wrench,
  محتوا: PenLine,
  "تجربه کاربری": MousePointerClick,
  اعتبارسازی: Link2,
  "سئو محلی": MapPin,
};

function Section({
  icon: Icon,
  title,
  sub,
  children,
  delay = 0,
}: {
  icon: typeof Wrench;
  title: string;
  sub?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="mt-10">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl border border-gold-400/25 bg-gold-400/10 text-gold-400">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
          {sub && <p className="mt-0.5 text-[12.5px] text-fog-500">{sub}</p>}
        </div>
      </div>
      {children}
    </Reveal>
  );
}

export default async function CompanyReport({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getLeadById(Number(id));
  if (!company) notFound();

  const r = company.report;
  const analyzedAt = r
    ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeStyle: "short" }).format(new Date(r.analyzedAt))
    : null;
  const outreach = r ? buildOutreach(company) : null;

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-grid opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

        <Reveal>
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/companies"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-fog-500 transition hover:text-gold-300"
            >
              <ArrowRight className="size-4" />
              بازگشت به فهرست شرکت‌ها
            </Link>
            {r && <PrintButton />}
          </div>
        </Reveal>

        <div className="print-only mt-6 hidden text-center">
          <div className="text-lg font-black">گزارش تحلیل سئو و حضور گوگلی</div>
          <div className="mt-1 text-xs text-gray-500">
            رادار لید · اتوماسیون شکار لید نمایشگاهی {analyzedAt ? `· ${analyzedAt}` : ""}
          </div>
        </div>

        {/* ---------- HEADER ---------- */}
        <Reveal delay={0.05}>
          <div className="card-surface relative mt-5 overflow-hidden rounded-3xl p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-40 -right-40 size-96 rounded-full glow-gold" />
            <div className="relative flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <span className="grid size-14 place-items-center rounded-2xl border border-gold-400/25 bg-gold-400/10 text-gold-400">
                  <Building2 className="size-7" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <span className="rounded-full border border-line bg-white/5 px-2.5 py-1 text-fog-300">
                      {company.category}
                    </span>
                    <span className="rounded-full border border-line bg-white/5 px-2.5 py-1 text-fog-300">
                      {company.booth}
                    </span>
                    {r && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1",
                          r.dataSource === "live"
                            ? "border-mint-400/30 bg-mint-400/10 text-mint-400"
                            : "border-line bg-white/5 text-fog-500"
                        )}
                      >
                        <Satellite className="size-3" />
                        {r.dataSource === "live" ? "تحلیل زنده وب‌سایت" : "ارزیابی تخمینی"}
                      </span>
                    )}
                    {r && r.rankSource === "serper" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-mint-400/30 bg-mint-400/10 px-2.5 py-1 text-mint-400">
                        <Satellite className="size-3" />
                        رتبه از نتایج واقعی گوگل (Serper)
                      </span>
                    )}
                    {r && r.rankSource === "estimated" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-white/5 px-2.5 py-1 text-fog-500">
                        <Satellite className="size-3" />
                        رتبه برآوردی — با SERPER_API_KEY واقعی می‌شود
                      </span>
                    )}
                    {r && r.rankSource === "none" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-450/25 bg-rose-450/10 px-2.5 py-1 text-rose-450">
                        <Satellite className="size-3" />
                        بدون دامنه — رتبه‌گیری غیرممکن
                      </span>
                    )}
                  </div>
                  <h1 className="mt-2 text-3xl font-black sm:text-4xl">{company.name}</h1>
                  <p className="mt-1 text-[12.5px] text-fog-500">{company.exhibition}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-fog-300">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-gold-400" />
                      {company.city}
                    </span>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Phone className="size-3.5 text-gold-400" />
                      {company.phone}
                    </span>
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-gold-300 transition hover:text-gold-400"
                      >
                        <Globe2 className="size-3.5" />
                        <span dir="ltr">{company.website.replace(/^https?:\/\//, "")}</span>
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-bold text-rose-450">
                        <XCircle className="size-3.5" />
                        بدون وب‌سایت — نامرئی در گوگل
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {r ? (
                <div className="flex items-center gap-6">
                  <ScoreRing score={r.seoScore} size={124} stroke={10} label="امتیاز سئو" />
                  <div className="hidden flex-col gap-3 sm:flex">
                    <div className="rounded-2xl border border-line bg-ink/70 px-5 py-3 text-center">
                      {r.onPageOne ? (
                        <>
                          <Trophy className="mx-auto size-5 text-mint-400" />
                          <div className="mt-1 text-lg font-black text-mint-400">
                            رتبه {faInt(r.googleRank ?? 0)}
                          </div>
                          <div className="text-[10.5px] text-fog-500">در صفحه اول گوگل</div>
                        </>
                      ) : r.googleRank ? (
                        <>
                          <Target className="mx-auto size-5 text-gold-400" />
                          <div className="mt-1 text-lg font-black text-gold-300">
                            رتبه {faInt(r.googleRank)}
                          </div>
                          <div className="text-[10.5px] text-fog-500">خارج از صفحه اول</div>
                        </>
                      ) : (
                        <>
                          <CircleAlert className="mx-auto size-5 text-rose-450" />
                          <div className="mt-1 text-lg font-black text-rose-450">غایب</div>
                          <div className="text-[10.5px] text-fog-500">
                            {company.website ? "در ۱۰۰ نتیجه اول یافت نشد" : "هیچ سایتی ثبت نشده"}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-print flex flex-col items-end gap-3">
                  <p className="max-w-xs text-[12.5px] leading-6 text-fog-500">
                    این شرکت هنوز اسکن نشده؛ با یک کلیک حضور گوگلی آن بررسی و گزارش کامل ساخته می‌شود.
                  </p>
                  <AnalyzeButton id={company.id} />
                </div>
              )}
            </div>

            <div className="no-print relative mt-5 border-t border-line pt-4">
              <div className="mb-2.5 text-[11px] font-bold text-fog-500">مرحله‌ی پیگیری فروش</div>
              <StageSelect id={company.id} stage={company.stage} />
            </div>

            {r && analyzedAt && (
              <div className="relative mt-4 flex items-center gap-1.5 text-[11px] text-fog-500">
                <CalendarClock className="size-3.5" />
                آخرین تحلیل: {analyzedAt}
              </div>
            )}
          </div>
        </Reveal>

        {r && (
          <>
            {/* ---------- KEYWORDS + GOAL ---------- */}
            <Section
              icon={SearchCheck}
              title="کلیدواژه‌های هدف و مقصد نهایی"
              sub="عبارت‌هایی که باید این شرکت را به صفحه اول بیاورند"
              delay={0.05}
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_290px_290px]">
                <div className="card-surface rounded-2xl p-5">
                  <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-fog-500">
                    <KeyRound className="size-4 text-gold-400" />
                    رتبه فعلی هر کلیدواژه در گوگل
                    <span className="mr-auto text-[10px] font-medium text-fog-500/70">
                      {r.rankSource === "serper" ? "داده واقعی" : "داده برآوردی"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.keywordRanks.map((k) => (
                      <span
                        key={k.keyword}
                        className="inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/[0.07] px-3.5 py-1.5 text-[12.5px] font-bold text-gold-300"
                      >
                        {k.keyword}
                        {k.rank === null ? (
                          <span className="rounded-full bg-rose-450/15 px-2 py-0.5 text-[10px] font-black text-rose-450">
                            {r.rankSource === "none" ? "بدون دامنه" : "یافت نشد"}
                          </span>
                        ) : k.rank <= 10 ? (
                          <span className="rounded-full bg-mint-400/15 px-2 py-0.5 text-[10px] font-black text-mint-400 tabular-nums">
                            رتبه {faInt(k.rank)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-black text-fog-300 tabular-nums">
                            رتبه {faInt(k.rank)}
                          </span>
                        )}
                      </span>
                    ))}
                    {r.keywordRanks.length === 0 &&
                      r.keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full border border-gold-400/25 bg-gold-400/[0.07] px-3.5 py-1.5 text-[12.5px] font-bold text-gold-300"
                        >
                          {k}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="card-surface rounded-2xl p-5 text-center">
                  <div className="text-[11px] font-bold text-fog-500">امتیاز فرصت فروش</div>
                  <div
                    className="mt-1 text-3xl font-black tabular-nums"
                    style={{ color: toneColor[scoreTone(r.opportunity > 66 ? 80 : r.opportunity > 40 ? 60 : 30)] }}
                  >
                    {faInt(r.opportunity)}٪
                  </div>
                  <p className="mt-2 text-[11.5px] leading-5 text-fog-500">
                    {r.opportunity >= 70
                      ? "لید طلایی — نیاز فوری + بودجه نمایشگاهی خرج‌شده."
                      : r.opportunity >= 40
                        ? "فرصت خوب برای پیگیری تلفنی از غرفه."
                        : "اولویت پایین‌تر؛ رقابتش قوی‌تر است."}
                  </p>
                </div>
                <div className="card-surface rounded-2xl border-gold-400/20 p-5 text-center">
                  <div className="text-[11px] font-bold text-fog-500">هدف کمپین</div>
                  <div className="mt-1 text-2xl font-black text-gold-gradient">
                    ۱۰ نتیجه اول گوگل
                  </div>
                  <p className="mt-2 text-[11.5px] leading-5 text-fog-500">
                    {r.onPageOne
                      ? "این شرکت هدف را گرفته؛ حالا نوبت دفاع و عبور به Top 3 است."
                      : "با برنامه اقدام پایین، رسیدن به Top 10 طی ۹۰ تا ۱۲۰ روز شدنی است."}
                  </p>
                </div>
              </div>
            </Section>

            {/* ---------- OUTREACH ---------- */}
            {outreach && (
              <Section
                icon={MessageSquareText}
                title="پیام آماده ارسال به شرکت"
                sub="سه نسخه شخصی‌سازی‌شده از روی همین گزارش — کپی کنید و بفرستید"
                delay={0.09}
              >
                <div className="grid gap-4 lg:grid-cols-3">
                  {[
                    { icon: Smartphone, title: "پیامک کوتاه", body: outreach.sms, label: "کپی پیامک" },
                    { icon: MessageCircle, title: "پیام واتساپ", body: outreach.whatsapp, label: "کپی پیام واتساپ" },
                    { icon: PhoneCall, title: "اسکریپت تماس تلفنی", body: outreach.call, label: "کپی اسکریپت" },
                  ].map((m) => (
                    <div key={m.title} className="card-surface flex flex-col rounded-2xl p-5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[13px] font-black">
                          <m.icon className="size-4 text-gold-400" />
                          {m.title}
                        </span>
                        <span className="text-[10px] text-fog-500 tabular-nums">
                          {faInt(m.body.length)} کاراکتر
                        </span>
                      </div>
                      <p className="mt-3 flex-1 whitespace-pre-wrap rounded-xl border border-line bg-ink/60 p-4 text-[12px] leading-6 text-fog-300">
                        {m.body}
                      </p>
                      <div className="no-print mt-3 flex justify-end">
                        <CopyButton text={m.body} label={m.label} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11.5px] text-fog-500">
                  نکته: بعد از ارسال پیام، مرحله‌ی پیگیری فروش را در بالای همین صفحه روی «پیشنهاد ارسال شد»
                  بگذارید تا جریان لیدها قابل ردیابی بماند.
                </p>
              </Section>
            )}

            {/* ---------- CHECKS ---------- */}
            <Section
              icon={Radar}
              title="معاینه فنی وب‌سایت"
              sub={
                r.dataSource === "live"
                  ? "نتیجه اسکن زنده از سرور — وب‌سایت واقعی خزیده و پارس شده"
                  : "ارزیابی تخمینی — سایت از این سرور قابل خزیدن نبود"
              }
              delay={0.08}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {r.checks.map((c) => (
                  <div
                    key={c.key}
                    className={cn(
                      "card-surface rounded-2xl p-4",
                      c.ok ? "border-mint-400/15" : "border-rose-450/20"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      {c.ok ? (
                        <CheckCircle2 className="size-5 text-mint-400" />
                      ) : (
                        <XCircle className="size-5 text-rose-450" />
                      )}
                      <span
                        className={cn(
                          "text-[10px] font-black",
                          c.ok ? "text-mint-400" : "text-rose-450"
                        )}
                      >
                        {c.ok ? "سالم" : "مشکل"}
                      </span>
                    </div>
                    <div className="mt-2.5 text-[13.5px] font-black">{c.label}</div>
                    <p className="mt-1 text-[11px] leading-5 text-fog-500">{c.hint}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* ---------- ISSUES ---------- */}
            {r.issues.length > 0 && (
              <Section
                icon={CircleAlert}
                title="تشخیص مشکلات"
                sub={`${faInt(r.issues.length)} مشکل شناسایی شد — هر مشکل، یک دلیل غیبت از صفحه اول`}
                delay={0.1}
              >
                <div className="space-y-3">
                  {r.issues.map((issue) => {
                    const s = SEVERITY_CLS[issue.severity];
                    return (
                      <div key={issue.id} className="card-surface flex gap-4 rounded-2xl p-5">
                        <span className={cn("w-1 shrink-0 rounded-full", s.bar)} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15px] font-black">{issue.title}</h3>
                            <span
                              className={cn(
                                "rounded-full border border-line bg-white/5 px-2 py-0.5 text-[10px] font-black",
                                s.text
                              )}
                            >
                              شدت: {s.label}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[12.5px] leading-6 text-fog-300">{issue.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* ---------- ACTIONS ---------- */}
            <Section
              icon={Zap}
              title="برنامه اقدام پیشنهادی"
              sub="مرتب‌شده بر اساس اولویت؛ سهم هر کار در رشد رتبه با نوار اثر مشخص شده"
              delay={0.12}
            >
              <div className="grid gap-3 md:grid-cols-2">
                {r.actions.map((a, i) => {
                  const Icon = CAT_ICON[a.category] ?? Wrench;
                  return (
                    <div key={a.id} className="card-surface rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-ink text-gold-400">
                            <Icon className="size-4" />
                          </span>
                          <div>
                            <h3 className="text-[14px] font-black">
                              <span className="text-fog-500">{faNum(i + 1)}. </span>
                              {a.title}
                            </h3>
                            <span className="text-[10.5px] font-bold text-fog-500">{a.category}</span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black",
                            PRIORITY_CLS[a.priority]
                          )}
                        >
                          {a.priority}
                        </span>
                      </div>
                      <p className="mt-3 text-[12px] leading-6 text-fog-300">{a.detail}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="bar-grow h-full rounded-full bg-gradient-to-l from-gold-300 to-gold-500"
                            style={{ width: `${a.impact}%` }}
                          />
                        </div>
                        <span className="text-[10.5px] font-black text-gold-300 tabular-nums">
                          اثر {faInt(a.impact)}٪
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* ---------- DESIGN ---------- */}
            <Section
              icon={Palette}
              title="پیشنهاد طراحی وب‌سایت"
              sub="کانسپت بصری و ساختار صفحه که رتبه و تبدیل را با هم بالا می‌برد"
              delay={0.14}
            >
              <div className="card-surface overflow-hidden rounded-3xl">
                <div className="border-b border-line bg-gradient-to-l from-gold-400/[0.08] to-transparent p-6">
                  <p className="text-[17px] font-black leading-8 sm:text-xl">{r.design.headline}</p>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-fog-300">
                    <span>
                      <b className="text-gold-300">سبک: </b>
                      {r.design.style}
                    </span>
                    <span>
                      <b className="text-gold-300">تایپوگرافی: </b>
                      {r.design.font}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <b className="text-gold-300">CTA اصلی: </b>«{r.design.cta}»
                    </span>
                  </div>
                </div>
                <div className="grid gap-0 md:grid-cols-2">
                  <div className="border-b border-line p-6 md:border-b-0 md:border-l">
                    <div className="mb-4 flex items-center gap-2 text-[12px] font-bold text-fog-500">
                      <Palette className="size-4 text-gold-400" />
                      پالت رنگ پیشنهادی
                    </div>
                    <div className="space-y-3">
                      {r.design.palette.map((p) => (
                        <div key={p.hex} className="flex items-center gap-3">
                          <span
                            className="size-11 shrink-0 rounded-xl border border-white/10 shadow-lg"
                            style={{ background: p.hex }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-black">{p.name}</div>
                            <div className="text-[10.5px] text-fog-500">{p.role}</div>
                          </div>
                          <code className="rounded-md bg-white/5 px-2 py-1 text-[10.5px] text-fog-300" dir="ltr">
                            {p.hex}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="mb-4 flex items-center gap-2 text-[12px] font-bold text-fog-500">
                      <Type className="size-4 text-gold-400" />
                      ساختار صفحه اول
                    </div>
                    <ul className="space-y-2.5">
                      {r.design.structure.map((s, i) => (
                        <li key={s} className="flex items-start gap-2.5 text-[13px] leading-6 text-fog-300">
                          <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-md bg-gold-400/15 text-[10px] font-black text-gold-300">
                            {faNum(i + 1)}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Section>

            {/* ---------- ROADMAP ---------- */}
            <Section
              icon={Route}
              title="نقشه راه رسیدن به ۱۰ نتیجه اول"
              sub="سه فاز پشت سر هم؛ هر فاز یک لول رتبه"
              delay={0.16}
            >
              <div className="grid gap-4 lg:grid-cols-3">
                {r.roadmap.map((phase, i) => (
                  <div key={phase.title} className="card-surface relative rounded-2xl p-6">
                    <div className="absolute -top-3 right-6 rounded-full border border-gold-400/40 bg-ink px-3 py-1 text-[10.5px] font-black text-gold-300">
                      {phase.window}
                    </div>
                    <h3 className="mt-2 text-[16px] font-black">{phase.title}</h3>
                    <p className="mt-1 text-[12px] font-bold text-gold-300">{phase.goal}</p>
                    <ul className="mt-4 space-y-2.5">
                      {phase.tasks.map((t) => (
                        <li key={t} className="flex items-start gap-2 text-[12px] leading-6 text-fog-300">
                          <CheckCircle2 className="mt-1 size-3.5 shrink-0 text-mint-400/70" />
                          {t}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 border-t border-line pt-3 text-[10.5px] text-fog-500">
                      فاز {faNum(i + 1)} از ۳
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ---------- FOOT CTA ---------- */}
            <Reveal delay={0.18} className="no-print mt-12">
              <div className="card-surface flex flex-wrap items-center justify-between gap-5 rounded-3xl border-gold-400/25 p-6 sm:p-8">
                <div>
                  <h3 className="text-lg font-black sm:text-xl">
                    این گزارش آماده ارائه به {company.name} است
                  </h3>
                  <p className="mt-1 text-[12.5px] text-fog-500">
                    مشکل، راه‌حل و نقشه راه مشخص است — یک پیشنهاد طراحی + سئو دور از دسترس نیست.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <AnalyzeButton id={company.id} compact />
                  <Link
                    href="/companies"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong px-5 py-2.5 text-[12.5px] font-bold text-fog-300 transition hover:border-gold-400/50 hover:text-gold-300"
                  >
                    شکار بعدی
                    <ArrowRight className="size-4 rotate-180" />
                  </Link>
                </div>
              </div>
            </Reveal>
          </>
        )}

        {!r && (
          <Reveal delay={0.12} className="no-print mt-10">
            <div className="card-surface grid place-items-center gap-4 rounded-3xl px-6 py-20 text-center">
              <ScoreRing
                score={0}
                size={72}
                stroke={7}
                label="در انتظار"
              />
              <p className="max-w-md text-[13.5px] leading-7 text-fog-500">
                هنوز تحلیلی برای این شرکت انجام نشده. با اجرای اسکن، حضور گوگلی، سلامت سئو و
                پیشنهاد طراحی سایتش ساخته می‌شود — همه توی همین صفحه.
              </p>
              <AnalyzeButton id={company.id} />
            </div>
          </Reveal>
        )}
      </main>
    </div>
  );
}
