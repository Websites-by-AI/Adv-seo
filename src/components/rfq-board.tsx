"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Handshake,
  Loader2,
  LockKeyhole,
  MailCheck,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import type { AnonymousBrief, QuoteRequest, SeoVendor, VendorQuote } from "@/db/schema";
import { cn, faNum } from "@/lib/utils";
import type { LeadRow } from "./types";
import { Badge, Button, Chip, Panel, SiteFooter, SiteHeader, Stat } from "./ui";

interface MarketEstimate {
  title: string;
  note: string;
  recommendedInviteCount: number;
  recommendedShortlistCount: number;
  segments: { label: string; countMin: number; countMax: number; fit: string }[];
}

interface RfqRow extends QuoteRequest {
  companyName: string;
  totalMin: number;
  totalMax: number;
  quotes: VendorQuote[];
}

interface ApiState {
  market: MarketEstimate;
  vendors: SeoVendor[];
  requests: RfqRow[];
}

function toman(n: number | null | undefined) {
  return `${faNum(n ?? 0)} تومان`;
}

function statusTone(status: string): "zinc" | "sky" | "amber" | "emerald" {
  if (status === "draft") return "zinc";
  if (status === "sent") return "sky";
  if (status === "revealed" || status === "escrow") return "amber";
  return "emerald";
}

function statusLabel(status: string) {
  return {
    draft: "پیش‌نویس محرمانه",
    sent: "ارسال شده / قیمت گرفته شد",
    escrow: "امانت ثبت شد",
    revealed: "اطلاعات واقعی باز شد",
    awarded: "مجری انتخاب شد",
    closed: "بسته شده",
  }[status] ?? status;
}

export function RfqBoard() {
  const [state, setState] = useState<ApiState | null>(null);
  const [companies, setCompanies] = useState<LeadRow[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [inviteCount, setInviteCount] = useState(12);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    const [rfqRes, companiesRes] = await Promise.all([
      fetch("/api/rfq", { cache: "no-store" }),
      fetch("/api/companies", { cache: "no-store" }),
    ]);
    if (rfqRes.ok) setState(await rfqRes.json());
    if (companiesRes.ok) {
      const d = await companiesRes.json();
      setCompanies(d.companies ?? []);
      const first = (d.companies ?? []).find((c: LeadRow) => c.proposalId);
      if (first && selectedCompanyId === null) setSelectedCompanyId(first.id);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  const proposalCompanies = useMemo(
    () => companies.filter((c) => c.proposalId && c.onFirstPage === false),
    [companies],
  );

  const filteredCompanies = proposalCompanies.filter((c) => !search || c.name.includes(search));

  const createRfq = async () => {
    if (!selectedCompanyId) return;
    setBusy("create");
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: selectedCompanyId, inviteCount }),
      });
      const d = await res.json();
      if (!res.ok) return showToast(d.error ?? "خطا در ساخت استعلام");
      showToast("استعلام محرمانه ساخته شد");
      await load();
    } finally {
      setBusy(null);
    }
  };

  const action = async (requestId: number, actionName: "send" | "reveal" | "award", vendorId?: number) => {
    setBusy(`${actionName}-${requestId}`);
    try {
      const res = await fetch(`/api/rfq/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, vendorId }),
      });
      const d = await res.json();
      if (!res.ok) return showToast(d.error ?? "خطا در اجرای عملیات");
      showToast(
        actionName === "send"
          ? "استعلام ارسال شد و قیمت‌های نمونه دریافت شد"
          : actionName === "reveal"
            ? "اطلاعات واقعی بعد از امانت/پورسانت باز شد"
            : "مجری انتخاب شد",
      );
      await load();
    } finally {
      setBusy(null);
    }
  };

  const bestQuote = (quotes: VendorQuote[]) =>
    quotes.length
      ? [...quotes].sort((a, b) => (a.priceMin + a.priceMax) / 2 - (b.priceMin + b.priceMax) / 2)[0]
      : null;

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-4 pb-10 sm:px-6">
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[520px]" />

      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6">
        <SiteHeader
          tone="amber"
          title="مناقصه محرمانه سئو"
          subtitle="استعلام قیمت از سئوکارها بدون افشای نام شرکت لید"
          actions={
            <Button variant="ghost" href="/" icon={<ArrowRight className="h-4 w-4" />}>
              داشبورد
            </Button>
          }
        />
      </div>

      <section className="relative z-10 pt-10 text-center">
        <p className="text-xs font-bold text-amber-300">Confidential SEO RFQ</p>
        <h1 className="shimmer-text mx-auto mt-3 max-w-3xl text-3xl font-black leading-[1.35] sm:text-5xl">
          قیمت سئو را بگیر؛ نام مشتری را محفوظ نگه دار
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-zinc-400">
          پکیج پیشنهادی را به شکل ناشناس برای ارائه‌دهندگان سئو می‌فرستید. آن‌ها فقط صنعت، وضعیت سایت،
          اهداف و بودجه پکیج را می‌بینند. نام شرکت، دامنه و تماس فقط بعد از امانت/پورسانت یا انتخاب مجری
          باز می‌شود.
        </p>
      </section>

      {!state ? (
        <div className="relative z-10 flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      ) : (
        <>
          {/* Market estimate */}
          <section className="relative z-10 mt-8 grid gap-4 lg:grid-cols-[1fr_340px]">
            <Panel className="rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-400/15 ring-1 ring-amber-400/40">
                  <Users className="h-5 w-5 text-amber-300" />
                </span>
                <div>
                  <h2 className="text-lg font-black">{state.market.title}</h2>
                  <p className="mt-2 text-xs leading-7 text-zinc-500">{state.market.note}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {state.market.segments.map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5">
                    <p className="text-sm font-extrabold text-zinc-100">{s.label}</p>
                    <p className="mt-2 text-2xl font-black text-amber-300">
                      {faNum(s.countMin)} تا {faNum(s.countMax)}
                    </p>
                    <p className="mt-1 text-[11px] leading-6 text-zinc-500">{s.fit}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Stat icon={Users} label="ارائه‌دهنده آماده دعوت" value={state.vendors.length} tone="text-amber-300" />
              <Stat icon={MailCheck} label="تعداد دعوت پیشنهادی" value={state.market.recommendedInviteCount} tone="text-emerald-300" delay={0.08} />
              <Stat icon={Scale} label="شورت‌لیست پیشنهادی" value={state.market.recommendedShortlistCount} tone="text-sky-300" delay={0.16} />
              <Stat icon={LockKeyhole} label="درخواست محرمانه" value={state.requests.length} tone="text-rose-300" delay={0.24} />
            </div>
          </section>

          {/* Create RFQ */}
          <section className="relative z-10 mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
            <Panel className="rounded-3xl p-6">
              <h2 className="flex items-center gap-2 text-sm font-black">
                <Sparkles className="h-4 w-4 text-amber-300" />
                ساخت استعلام محرمانه جدید
              </h2>
              <p className="mt-2 text-[11px] leading-6 text-zinc-500">
                فقط شرکت‌هایی نمایش داده می‌شوند که پیشنهادنامه دارند و در صفحه اول گوگل نیستند.
              </p>
              <div className="relative mt-4">
                <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجوی لید…"
                  className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pr-9 pl-3 text-xs placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none"
                />
              </div>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pl-1">
                {filteredCompanies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCompanyId(c.id)}
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 text-right ring-1 transition",
                      selectedCompanyId === c.id
                        ? "bg-amber-400/12 text-amber-200 ring-amber-400/35"
                        : "bg-white/[0.03] text-zinc-400 ring-white/5 hover:ring-white/15",
                    )}
                  >
                    <p className="truncate text-xs font-extrabold">{c.name}</p>
                    <p className="mt-1 text-[10px] text-zinc-600">
                      رتبه {c.googleRank ? faNum(c.googleRank) : "—"} • پیشنهاد آماده
                    </p>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2">
                {[5, 8, 12, 15].map((n) => (
                  <Chip key={n} tone="amber" active={inviteCount === n} onClick={() => setInviteCount(n)}>
                    {faNum(n)} دعوت
                  </Chip>
                ))}
              </div>
              <Button
                variant="amber"
                size="lg"
                loading={busy === "create"}
                disabled={!selectedCompanyId}
                icon={<LockKeyhole className="h-4 w-4" />}
                onClick={createRfq}
                className="mt-4 w-full rounded-2xl"
              >
                ساخت بریف ناشناس
              </Button>
            </Panel>

            {/* Vendor pool */}
            <Panel className="rounded-3xl p-6">
              <h2 className="flex items-center gap-2 text-sm font-black">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                استخر ارائه‌دهندگان سئو — نمونه قابل گسترش
              </h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {state.vendors.slice(0, 12).map((v) => (
                  <div key={v.id} className="rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-extrabold text-zinc-200">{v.name}</p>
                      <Badge tone={v.tier === "top-agency" ? "amber" : v.tier === "freelancer" ? "sky" : "emerald"}>
                        {v.tier === "top-agency" ? "تاپ" : v.tier === "freelancer" ? "فریلنسر" : "آژانس"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-600">
                      {v.city} • حداقل بودجه {toman(v.minProjectBudget)} • امتیاز {faNum(v.score)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {v.specialties.slice(0, 3).map((s) => (
                        <span key={s} className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-zinc-500">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          {/* Requests */}
          <section className="relative z-10 mt-6 space-y-4">
            <h2 className="text-base font-black">استعلام‌های محرمانه ساخته‌شده</h2>
            {state.requests.length === 0 && (
              <Panel className="rounded-3xl p-10 text-center text-sm text-zinc-500">
                هنوز استعلامی ساخته نشده است. از ستون بالا یک لید انتخاب کنید.
              </Panel>
            )}
            {state.requests.map((r) => {
              const brief = r.brief as AnonymousBrief;
              const best = bestQuote(r.quotes);
              return (
                <motion.article
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-3xl p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-amber-200">{r.alias}</h3>
                        <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                        <Badge tone="rose" icon={<EyeOff className="h-3 w-3" />}>
                          نام مشتری مخفی
                        </Badge>
                      </div>
                      <p className="mt-2 max-w-2xl text-[11px] leading-6 text-zinc-500">
                        {brief.confidentiality}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-zinc-600">بودجه پکیج مرجع</p>
                      <p className="mt-1 text-sm font-black text-emerald-300">
                        {toman(r.totalMin)} تا {toman(r.totalMax)}
                      </p>
                      <p className="mt-1 text-[10px] text-amber-300">
                        امانت پیشنهادی: {toman(r.escrowAmount)} • پورسانت {faNum(r.commissionPercent)}٪
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5">
                      <p className="text-[11px] font-black text-zinc-400">ویژگی‌های قابل ارسال</p>
                      <ul className="mt-2 space-y-1.5 text-[10px] leading-5 text-zinc-500">
                        <li>صنعت: {brief.industry}</li>
                        <li>محدوده: {brief.city}</li>
                        {brief.currentState.slice(0, 4).map((x) => (
                          <li key={x}>• {x}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5">
                      <p className="text-[11px] font-black text-zinc-400">اهداف و تعهدات</p>
                      <ul className="mt-2 space-y-1.5 text-[10px] leading-5 text-zinc-500">
                        {brief.goals.map((x) => (
                          <li key={x}>• {x}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-rose-400/[0.06] p-4 ring-1 ring-rose-400/15">
                      <p className="text-[11px] font-black text-rose-200">خط قرمز ارسال به مجری</p>
                      <ul className="mt-2 space-y-1.5 text-[10px] leading-5 text-rose-300/80">
                        {brief.prohibited.slice(0, 4).map((x) => (
                          <li key={x}>• {x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
                    <Button
                      variant="sky"
                      size="sm"
                      loading={busy === `send-${r.id}`}
                      disabled={r.status !== "draft"}
                      icon={<MailCheck className="h-4 w-4" />}
                      onClick={() => action(r.id, "send")}
                    >
                      ارسال ناشناس و دریافت قیمت
                    </Button>
                    <Button
                      variant="amber"
                      size="sm"
                      loading={busy === `reveal-${r.id}`}
                      disabled={!r.quotes.length || ["revealed", "awarded", "closed"].includes(r.status)}
                      icon={<Eye className="h-4 w-4" />}
                      onClick={() => action(r.id, "reveal")}
                    >
                      ثبت امانت/پورسانت و باز کردن اطلاعات
                    </Button>
                    {best && (
                      <Button
                        size="sm"
                        loading={busy === `award-${r.id}`}
                        disabled={r.status === "draft" || r.status === "awarded"}
                        icon={<Handshake className="h-4 w-4" />}
                        onClick={() => action(r.id, "award", best.vendorId)}
                      >
                        انتخاب ارزان‌ترین مجری
                      </Button>
                    )}
                    {r.status === "revealed" || r.status === "awarded" ? (
                      <Badge tone="emerald" icon={<Building2 className="h-3 w-3" />}>
                        اطلاعات واقعی شرکت قابل تحویل است: {r.companyName}
                      </Badge>
                    ) : (
                      <Badge tone="zinc" icon={<LockKeyhole className="h-3 w-3" />}>
                        برای مجری فقط alias و ویژگی‌ها نمایش داده می‌شود
                      </Badge>
                    )}
                  </div>

                  {/* Quotes */}
                  {r.quotes.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {r.quotes
                        .slice()
                        .sort((a, b) => (a.priceMin + a.priceMax) / 2 - (b.priceMin + b.priceMax) / 2)
                        .slice(0, 6)
                        .map((q, i) => (
                          <div
                            key={q.id}
                            className={cn(
                              "rounded-2xl p-4 ring-1",
                              i === 0
                                ? "bg-emerald-400/10 ring-emerald-400/25"
                                : "bg-white/[0.03] ring-white/5",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-black text-zinc-200">پیشنهاد #{faNum(i + 1)}</p>
                              {i === 0 && <Badge tone="emerald" icon={<CheckCircle2 className="h-3 w-3" />}>به‌صرفه‌ترین</Badge>}
                            </div>
                            <p className="mt-2 flex items-center gap-1 text-sm font-black text-amber-300">
                              <Banknote className="h-4 w-4" />
                              {toman(q.priceMin)} تا {toman(q.priceMax)}
                            </p>
                            <p className="mt-1 text-[10px] text-zinc-600">
                              مدت اجرا: {faNum(q.durationWeeks)} هفته • وضعیت: {q.status}
                            </p>
                            <p className="mt-2 text-[10px] leading-5 text-zinc-500">{q.message}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </motion.article>
              );
            })}
          </section>
        </>
      )}

      <SiteFooter />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-amber-400 px-6 py-3.5 text-sm font-black text-amber-950 shadow-2xl shadow-amber-500/40">
          {toast}
        </div>
      )}
    </div>
  );
}
