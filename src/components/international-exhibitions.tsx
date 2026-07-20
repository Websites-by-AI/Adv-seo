"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Globe2,
  Loader2,
  MapPin,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { Button, Chip, SiteFooter, SiteHeader } from "@/components/ui";

interface ParsedCompany {
  name: string;
  booth?: string;
  category?: string;
  phone?: string;
  email?: string;
  website?: string;
  country?: string;
  sourceUrl?: string;
}

interface EventRow {
  id: number;
  name: string;
  country: string | null;
  city: string | null;
  venue: string | null;
  startDate: string | null;
  endDate: string | null;
  year: string | null;
  sourceUrl: string | null;
  companiesCount: number;
}

const HEADER_ALIASES: Record<string, keyof ParsedCompany> = {
  "نام شرکت": "name",
  شرکت: "name",
  company: "name",
  exhibitor: "name",
  name: "name",
  غرفه: "booth",
  booth: "booth",
  stand: "booth",
  "حوزه فعالیت": "category",
  صنعت: "category",
  category: "category",
  industry: "category",
  تلفن: "phone",
  "شماره تماس": "phone",
  phone: "phone",
  mobile: "phone",
  ایمیل: "email",
  email: "email",
  "وب‌سایت": "website",
  "وب سایت": "website",
  website: "website",
  url: "website",
  کشور: "country",
  country: "country",
};

function splitCsvLine(line: string) {
  const out: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && [",", ";", "\t", "|"].includes(char)) {
      out.push(value.trim());
      value = "";
    } else value += char;
  }
  out.push(value.trim());
  return out;
}

function parseDelimited(text: string): ParsedCompany[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = splitCsvLine(lines[0]);
  const mapped = first.map((header) => HEADER_ALIASES[header.toLowerCase()] ?? null);
  const hasHeader = mapped.some(Boolean);
  const headers = hasHeader ? mapped : (["name", "booth", "category", "phone", "website"] as const);
  return lines.slice(hasHeader ? 1 : 0).map((line) => {
    const cells = splitCsvLine(line);
    const row: ParsedCompany = { name: "" };
    cells.forEach((cell, index) => {
      const key = headers[index];
      if (key) row[key] = cell;
    });
    return row;
  }).filter((row) => row.name.trim().length >= 2);
}

function parseHtmlTable(html: string): ParsedCompany[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  const table = document.querySelector("table");
  if (!table) return [];
  const rows = Array.from(table.querySelectorAll("tr"));
  if (!rows.length) return [];
  const headers = Array.from(rows[0].querySelectorAll("th,td")).map((cell) =>
    HEADER_ALIASES[(cell.textContent ?? "").trim().toLowerCase()] ?? null,
  );
  return rows.slice(1).map((tr) => {
    const cells = Array.from(tr.querySelectorAll("td,th"));
    const row: ParsedCompany = { name: "" };
    cells.forEach((cell, index) => {
      const key = headers[index];
      if (key) row[key] = (cell.textContent ?? "").trim();
    });
    return row;
  }).filter((row) => row.name.length >= 2);
}

export function InternationalExhibitions() {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("بین‌المللی");
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [year, setYear] = useState("2026");
  const [sourceUrl, setSourceUrl] = useState("");
  const [format, setFormat] = useState<"auto" | "csv" | "html" | "text">("auto");
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedCompany[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadEvents = async () => {
    const response = await fetch("/api/international-exhibitions", { cache: "no-store" });
    if (response.ok) setEvents((await response.json()).exhibitions ?? []);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const preview = useMemo(() => parsed.slice(0, 20), [parsed]);

  const parse = () => {
    const isHtml = format === "html" || (format === "auto" && /<table|<tr|<td/i.test(raw));
    const result = isHtml ? parseHtmlTable(raw) : parseDelimited(raw);
    const seen = new Set<string>();
    const unique = result.filter((company) => {
      const key = company.name.toLowerCase().replace(/[\s‌]+/g, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setParsed(unique);
    setMessage(`${unique.length.toLocaleString("fa-IR")} شرکت آماده ورود است`);
  };

  const importCompanies = async () => {
    if (!name.trim() || parsed.length === 0) {
      setMessage("نام نمایشگاه و فهرست شرکت‌ها الزامی است");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/international-exhibitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: { name, country, city, venue, startDate, endDate, year, sourceUrl },
          companies: parsed,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "خطای واردسازی");
      setMessage(`${data.inserted.toLocaleString("fa-IR")} شرکت وارد شد؛ ${data.skipped.toLocaleString("fa-IR")} مورد تکراری/نامعتبر`);
      setParsed([]);
      setRaw("");
      await loadEvents();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "خطای واردسازی");
    } finally {
      setBusy(false);
    }
  };

  const loadDemo = () => {
    setName("Arab Health / WHX Dubai 2026 — نمونه");
    setCountry("امارات متحده عربی");
    setCity("دبی");
    setVenue("Dubai Exhibition Centre");
    setStartDate("2026-02-09");
    setEndDate("2026-02-12");
    setRaw("Company,Booth,Industry,Phone,Website,Country\nMediTech Global,H2-A14,Medical Devices,+971500000001,meditech.example,UAE\nHealthSoft International,H4-B09,Health Software,+971500000002,,UAE\nPars Medical Export,H1-C20,Medical Equipment,+982112345678,parsmedical.example,Iran");
    setFormat("csv");
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-4 pb-12 sm:px-6" dir="rtl">
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <SiteHeader
        title="نمایشگاه‌های بین‌المللی"
        subtitle="ورود شرکت‌کنندگان، کشف وب‌سایت و انتقال به اتوماسیون سئو"
        actions={
          <a href="/" className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-emerald-400/40 hover:text-emerald-300">
            بازگشت به داشبورد
          </a>
        }
      />

      <main className="relative z-10 mt-8 grid gap-6 lg:grid-cols-[400px_1fr]">
        <section className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25"><Globe2 className="size-5" /></span>
            <div><h2 className="text-sm font-black">مشخصات رویداد</h2><p className="text-[10px] text-zinc-500">Event metadata</p></div>
          </div>
          <div className="mt-5 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام نمایشگاه *" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-400/50" />
            <div className="grid grid-cols-2 gap-2">
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="کشور" className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs outline-none" />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="شهر" className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs outline-none" />
            </div>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="محل برگزاری" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <input value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="تاریخ شروع" className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs outline-none" />
              <input value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="تاریخ پایان" className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs outline-none" />
            </div>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="URL فهرست شرکت‌کنندگان" dir="ltr" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs outline-none" />
          </div>

          <div className="mt-6 flex items-center gap-2"><FileSpreadsheet className="size-4 text-amber-300" /><h3 className="text-xs font-black">فهرست شرکت‌ها</h3></div>
          <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="mt-3 w-full rounded-xl border border-white/10 bg-[#0e1319] px-3 py-3 text-xs">
            <option value="auto">تشخیص خودکار</option><option value="csv">CSV / TSV</option><option value="html">HTML Table</option><option value="text">یک شرکت در هر خط</option>
          </select>
          <input type="file" accept=".csv,.tsv,.txt,.html,.htm" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setRaw(String(reader.result ?? "")); reader.readAsText(file); }} className="mt-3 block w-full text-[10px] text-zinc-400 file:ml-3 file:rounded-lg file:border-0 file:bg-emerald-400/10 file:px-3 file:py-2 file:text-emerald-300" />
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="CSV، HTML یا متن شرکت‌ها را وارد کنید" className="mt-3 min-h-52 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-6 outline-none focus:border-emerald-400/50" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={loadDemo} variant="outline"><Upload className="size-4" />نمونه بین‌المللی</Button>
            <Button onClick={parse}><Search className="size-4" />استخراج</Button>
          </div>
          <Button className="mt-2 w-full" onClick={importCompanies} disabled={busy || parsed.length === 0}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}ورود به دیتابیس
          </Button>
          {message && <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-[10px] leading-5 text-emerald-200">{message}</p>}
        </section>

        <section className="space-y-6">
          <div className="glass rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black">پیش‌نمایش شرکت‌ها</h2><p className="mt-1 text-[10px] text-zinc-500">{parsed.length.toLocaleString("fa-IR")} شرکت پس از حذف تکراری‌ها</p></div><Chip tone={parsed.length ? "emerald" : "amber"}>{parsed.length ? "آماده ورود" : "بدون داده"}</Chip></div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
              <table className="w-full min-w-[700px] text-right text-xs"><thead className="bg-white/5 text-[10px] text-zinc-500"><tr><th className="px-4 py-3">شرکت</th><th className="px-4 py-3">غرفه</th><th className="px-4 py-3">حوزه</th><th className="px-4 py-3">کشور</th><th className="px-4 py-3">وب‌سایت</th></tr></thead><tbody>{preview.map((company, index) => <tr key={`${company.name}-${index}`} className="border-t border-white/6"><td className="px-4 py-3 font-bold">{company.name}</td><td className="px-4 py-3 text-zinc-400">{company.booth || "—"}</td><td className="px-4 py-3 text-zinc-400">{company.category || "—"}</td><td className="px-4 py-3 text-zinc-400">{company.country || country || "—"}</td><td className="px-4 py-3" dir="ltr">{company.website || <span className="text-rose-400">بدون سایت</span>}</td></tr>)}</tbody></table>
            </div>
          </div>

          <div className="glass rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-3"><CalendarDays className="size-5 text-amber-300" /><div><h2 className="text-sm font-black">رویدادهای ثبت‌شده</h2><p className="text-[10px] text-zinc-500">برای اجرای کشف سایت و ممیزی، از داشبورد اصلی استفاده کنید.</p></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{events.map((event) => <article key={event.id} className="rounded-2xl border border-white/8 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xs font-black">{event.name}</h3><p className="mt-1 text-[10px] text-zinc-500">{[event.city,event.country,event.venue].filter(Boolean).join(" · ")}</p></div><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">{event.companiesCount.toLocaleString("fa-IR")} شرکت</span></div><div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-400"><CalendarDays className="size-3.5" />{event.startDate || event.year || "تاریخ نامشخص"}<MapPin className="mr-2 size-3.5" />{event.city || "—"}</div></article>)}</div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
