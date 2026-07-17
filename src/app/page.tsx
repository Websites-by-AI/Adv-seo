import Link from "next/link";
import { ArrowLeft, Flame, Sparkles, Target, Workflow } from "lucide-react";
import Navbar from "@/components/Navbar";
import RunPanel from "@/components/RunPanel";
import Pipeline from "@/components/Pipeline";
import LeadCard from "@/components/LeadCard";
import { Reveal, Stat } from "@/components/motion";
import { getLeads } from "@/lib/queries";
import { EXHIBITION_NAME } from "@/lib/data";
import { faInt } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const leads = await getLeads();
  const total = leads.length;
  const analyzed = leads.filter((l) => l.status === "analyzed");
  const won = leads.filter((l) => l.stage === "won").length;
  const hot = analyzed
    .filter((l) => !l.report?.onPageOne && l.stage !== "won")
    .sort((a, b) => (b.report?.opportunity ?? 0) - (a.report?.opportunity ?? 0));
  const noSite = leads.filter((l) => !l.website).length;

  return (
    <div className="relative">
      <Navbar />

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero-radar.jpg"
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/85 to-ink" />
          <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 text-[12px] font-bold text-gold-300">
              <Sparkles className="size-3.5" />
              اتوماسیون شکار لید از دل {EXHIBITION_NAME}
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.25] tracking-tight sm:text-6xl sm:leading-[1.2]">
              هر غرفه نمایشگاه،
              <br />
              <span className="text-gold-gradient">یک لید طلایی در گوگل.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-[15px] leading-8 text-fog-300 sm:text-base">
              رادار لید، لیست شرکت‌های نمایشگاه را برمی‌دارد، تک‌تک آن‌ها را در گوگل ردیابی
              می‌کند و آن‌هایی که <b className="text-white">صفحه اول نیستند یا اصلاً سایت ندارند</b>{" "}
              را شکار می‌کند؛ سپس برای هرکدام گزارش پیشنهاد سئو، پیشنهاد طراحی وب‌سایت و نقشه راه
              رسیدن به <b className="text-gold-300">۱۰ نتیجه اول گوگل</b> می‌سازد.
            </p>
          </Reveal>

          <Reveal delay={0.24} className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#console"
              className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-7 py-3.5 text-sm font-black text-ink shadow-[0_8px_40px_rgba(242,169,59,0.4)] transition hover:bg-gold-300"
            >
              <Target className="size-4" />
              اجرای اتوماسیون
            </a>
            <Link
              href="/companies"
              className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-white/[0.04] px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:border-gold-400/50 hover:text-gold-300"
            >
              مشاهده شرکت‌ها
              <ArrowLeft className="size-4" />
            </Link>
          </Reveal>

          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Stat value={total} label="شرکت غرفه‌دار" sub={`از دیتای ${EXHIBITION_NAME}`} />
            <Stat value={hot.length} label="لید غایب از صفحه اول" sub="آماده تماس و پیشنهاد" tone="gold" />
            <Stat value={noSite} label="شرکت بدون وب‌سایت" sub="نامرئی مطلق در گوگل" tone="rose" />
            <Stat value={won} label="قرارداد بسته‌شده" sub="از چرخه پیگیری لیدها" tone="mint" />
          </div>
        </div>
      </section>

      {/* ---------- PIPELINE ---------- */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <div className="mb-10 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-gold-400/25 bg-gold-400/10 text-gold-400">
              <Workflow className="size-5" />
            </span>
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">موتور اتوماسیون چطور کار می‌کند؟</h2>
              <p className="mt-1 text-[13px] text-fog-500">
                چهار مرحله، یک کلیک — از فهرست نمایشگاه تا گزارش فروش آماده.
              </p>
            </div>
          </div>
        </Reveal>
        <Pipeline />
      </section>

      {/* ---------- CONSOLE ---------- */}
      <section id="console" className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
        <Reveal>
          <RunPanel serperEnabled={Boolean(process.env.SERPER_API_KEY)} />
        </Reveal>
      </section>

      {/* ---------- HOT LEADS ---------- */}
      <section className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl border border-rose-450/30 bg-rose-450/10 text-rose-450">
                <Flame className="size-5" />
              </span>
              <div>
                <h2 className="text-2xl font-black sm:text-3xl">داغ‌ترین شکارها</h2>
                <p className="mt-1 text-[13px] text-fog-500">
                  کم‌امتیازترین شرکت‌ها = بیشترین نیاز = ساده‌ترین فروش.{" "}
                  {hot.length > 0 && (
                    <span className="text-gold-300">{faInt(hot.length)} لید فعال</span>
                  )}
                </p>
              </div>
            </div>
            <Link
              href="/companies"
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gold-400 transition hover:text-gold-300"
            >
              مشاهده همه شرکت‌ها
              <ArrowLeft className="size-4" />
            </Link>
          </div>
        </Reveal>

        {hot.length === 0 ? (
          <Reveal>
            <div className="card-surface grid place-items-center rounded-3xl px-6 py-20 text-center">
              <p className="max-w-md text-[14px] leading-7 text-fog-500">
                هنوز شکاری ثبت نشده. از کنسول بالا اتوماسیون را اجرا کنید تا شرکت‌های نمایشگاه
                اسکن و لیدهای خارج از صفحه اول گوگل اینجا بچینند.
              </p>
              <a
                href="#console"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gold-400/40 bg-gold-400/10 px-6 py-3 text-[13px] font-black text-gold-300 transition hover:bg-gold-400/20"
              >
                <Target className="size-4" />
                برو به کنسول اتوماسیون
              </a>
            </div>
          </Reveal>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hot.slice(0, 6).map((c, i) => (
              <Reveal key={c.id} delay={i * 0.06}>
                <LeadCard company={c} index={i} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-line/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-[12px] text-fog-500 sm:px-6">
          <span className="font-bold">رادار لید — موتور شکار لید نمایشگاهی</span>
          <span>
            منبع داده: {EXHIBITION_NAME} · رسیدن به ۱۰ نتیجه اول گوگل، از همین‌جا شروع می‌شود.
          </span>
        </div>
      </footer>
    </div>
  );
}
