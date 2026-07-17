"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ClipboardPaste,
  FileUp,
  Globe2,
  Link2,
  Loader2,
  Plus,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn, faInt } from "@/lib/utils";

type Mode = "text" | "url";

interface ImportResult {
  inserted: number;
  skipped: number;
  total: number;
  preview: string[];
  exhibition: string;
}

export default function ImportPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [exhibition, setExhibition] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          text,
          url,
          exhibition: exhibition.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "خطا در پردازش");
        return;
      }
      setResult(data as ImportResult);
      setText("");
      setUrl("");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-surface overflow-hidden rounded-2xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right transition hover:bg-white/[0.03]"
      >
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-gold-400/25 bg-gold-400/10 text-gold-400">
            <FileUp className="size-5" />
          </span>
          <span>
            <span className="block text-[14.5px] font-black">افزودن فهرست نمایشگاه جدید</span>
            <span className="mt-0.5 block text-[11.5px] text-fog-500">
              لیست شرکت‌ها را جای‌گذاری کنید یا آدرس صفحه‌ی نمایشگاه را بدهید تا استخراج شود
            </span>
          </span>
        </span>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg border border-line text-fog-400 transition-transform duration-300",
            open && "rotate-45"
          )}
        >
          <Plus className="size-4" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="border-t border-line p-5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setMode("text")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-bold transition",
                    mode === "text"
                      ? "border-gold-400/50 bg-gold-400/10 text-gold-300"
                      : "border-line text-fog-500 hover:text-fog-300"
                  )}
                >
                  <ClipboardPaste className="size-3.5" />
                  جای‌گذاری متن (پیشنهادی)
                </button>
                <button
                  onClick={() => setMode("url")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-bold transition",
                    mode === "url"
                      ? "border-gold-400/50 bg-gold-400/10 text-gold-300"
                      : "border-line text-fog-500 hover:text-fog-300"
                  )}
                >
                  <Link2 className="size-3.5" />
                  استخراج از آدرس صفحه
                </button>
                <input
                  value={exhibition}
                  onChange={(e) => setExhibition(e.target.value)}
                  placeholder="نام نمایشگاه (مثلاً: نمایشگاه صنایع چوب ۱۴۰۴)"
                  className="min-w-52 flex-1 rounded-lg border border-line bg-panel px-3.5 py-2 text-[12px] text-white outline-none placeholder:text-fog-500 focus:border-gold-400/50"
                />
              </div>

              {mode === "text" ? (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={7}
                  placeholder={
                    "هر سطر = یک شرکت. مثال:\nپنجره سازان ابتکار · ۰۲۸-۳۳۵۷۷۰۰۰\nشرکت آلومینیوم پارس — salam.ir\nگروه صنعتی درب ایرانیان"
                  }
                  className="mt-3 w-full rounded-xl border border-dashed border-line-strong bg-ink/60 p-4 text-[13px] leading-7 text-white outline-none placeholder:text-fog-500/70 focus:border-gold-400/50"
                />
              ) : (
                <div className="relative mt-3">
                  <Globe2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fog-500" />
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    dir="ltr"
                    placeholder="https://iranadfair.com/ad_category/…"
                    className="w-full rounded-xl border border-dashed border-line-strong bg-ink/60 py-3.5 pr-11 pl-4 text-left text-[13px] text-white outline-none placeholder:text-fog-500/70 focus:border-gold-400/50"
                  />
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={submit}
                  disabled={busy || (mode === "text" ? !text.trim() : !url.trim())}
                  className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-6 py-3 text-[13px] font-black text-ink transition hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
                  {busy ? "در حال پردازش…" : "پردازش و افزودن شرکت‌ها"}
                </button>

                {result && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-mint-400/30 bg-mint-400/10 px-4 py-2.5 text-[12px] font-bold text-mint-400">
                    <CheckCircle2 className="size-4" />
                    {faInt(result.inserted)} شرکت به «{result.exhibition}» اضافه شد
                    {result.skipped > 0 && ` · ${faInt(result.skipped)} تکراری رد شد`}
                  </span>
                )}
                {error && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-rose-450/30 bg-rose-450/10 px-4 py-2.5 text-[12px] font-bold text-rose-450">
                    <AlertTriangle className="size-4" />
                    {error}
                  </span>
                )}
              </div>

              <p className="mt-3 text-[11px] leading-5 text-fog-500">
                تلفن و سایتِ هر سطر خودکار تشخیص داده و از نام جدا می‌شود؛ شرکت‌های تازه با وضعیت
                «در انتظار» ثبت می‌شوند — بعد از افزودن، اتوماسیون را اجرا کنید تا اسکن شوند.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
