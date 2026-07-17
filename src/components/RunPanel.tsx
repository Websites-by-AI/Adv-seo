"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  Radar,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Crosshair,
  RefreshCcw,
  Satellite,
  Wifi,
} from "lucide-react";
import type { LeadView } from "@/lib/types";
import { faInt } from "@/lib/utils";

type Phase = "idle" | "running" | "done";

interface LogLine {
  id: number;
  text: string;
  kind: "info" | "lead" | "ok";
}

export default function RunPanel({ serperEnabled = false }: { serperEnabled?: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [leadsFound, setLeadsFound] = useState(0);

  const pushLog = (text: string, kind: LogLine["kind"] = "info") =>
    setLogs((prev) => [...prev.slice(-7), { id: Date.now() + Math.random(), text, kind }]);

  async function run(forceAll = false) {
    setPhase("running");
    setLogs([]);
    setLeadsFound(0);
    let found = 0;
    try {
      pushLog("دریافت فهرست غرفه‌داران نمایشگاه…");
      await fetch("/api/seed", { method: "POST" });
      const list = (await (await fetch("/api/companies", { cache: "no-store" })).json()) as LeadView[];
      const queue = forceAll ? list : list.filter((c) => c.status === "pending");

      if (queue.length === 0) {
        pushLog("همه شرکت‌ها اسکن شده‌اند؛ برای تازه‌سازی «اسکن مجدد کامل» را بزنید.", "ok");
        setPhase("done");
        router.refresh();
        return;
      }

      setProgress({ done: 0, total: queue.length });
      for (const company of queue) {
        pushLog(`اسکن ${company.name}…`);
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: company.id }),
        });
        if (!res.ok) {
          pushLog(`خطا در اسکن ${company.name} — رد شد`, "lead");
          continue;
        }
        const fresh = (await res.json()) as LeadView;
        const rank = fresh.report?.googleRank ?? null;
        const onOne = fresh.report?.onPageOne ?? false;
        const liveTag = fresh.report?.rankSource === "serper" ? " (رتبه واقعی گوگل)" : "";
        if (!onOne) {
          found += 1;
          setLeadsFound(found);
          if (!fresh.website) pushLog(`${fresh.name}: سایت ندارد — لید داغ ثبت شد`, "lead");
          else if (rank === null) pushLog(`${fresh.name}: غایب از ۱۰۰ نتیجه اول — لید ثبت شد${liveTag}`, "lead");
          else pushLog(`${fresh.name}: رتبه ${faInt(rank)} — خارج از صفحه اول${liveTag}`, "lead");
        } else {
          pushLog(`${fresh.name}: صفحه اول · رتبه ${faInt(rank ?? 0)}${liveTag}`, "ok");
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      pushLog(`اسکن کامل شد؛ ${faInt(found)} لید خارج از صفحه اول گوگل شکار شد.`, "ok");
      setPhase("done");
      router.refresh();
    } catch {
      pushLog("ارتباط با سرور قطع شد؛ دوباره تلاش کنید.", "lead");
      setPhase("idle");
    }
  }

  const running = phase === "running";
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="card-surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-32 -left-32 size-72 rounded-full glow-gold" />
      <div className="relative grid items-center gap-8 lg:grid-cols-[260px_1fr]">
        {/* Radar visual */}
        <div className="relative mx-auto size-52">
          <div className="absolute inset-0 rounded-full border border-gold-400/15" />
          <div className="absolute inset-6 rounded-full border border-gold-400/15" />
          <div className="absolute inset-12 rounded-full border border-gold-400/20" />
          <div className="absolute inset-20 rounded-full border border-gold-400/25 bg-gold-400/5" />
          <div className="absolute top-1/2 right-0 left-0 h-px bg-gold-400/10" />
          <div className="absolute right-1/2 top-0 bottom-0 w-px bg-gold-400/10" />
          {running && (
            <div
              className="radar-sweep absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, rgba(242,169,59,0.05) 300deg, rgba(242,169,59,0.4) 355deg, rgba(242,169,59,0.6) 360deg)",
              }}
            />
          )}
          <div className="absolute top-[28%] right-[30%] size-2 rounded-full bg-gold-400/80" />
          <div className="absolute top-[28%] right-[30%] size-2 rounded-full bg-gold-400 ping-slow" />
          <div className="absolute bottom-[26%] left-[28%] size-1.5 rounded-full bg-mint-400/70" />
          <div className="absolute top-[58%] right-[20%] size-1.5 rounded-full bg-rose-450/80" />
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid size-16 place-items-center rounded-full border border-gold-400/30 bg-ink/90 text-gold-400 shadow-[0_0_40px_rgba(242,169,59,0.25)]">
              {running ? <Loader2 className="size-6 animate-spin" /> : <Radar className="size-6" />}
            </span>
          </div>
        </div>

        {/* Controls + log */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black">کنسول اتوماسیون شکار لید</h2>
                <span
                  className={
                    serperEnabled
                      ? "inline-flex items-center gap-1 rounded-full border border-mint-400/30 bg-mint-400/10 px-2.5 py-1 text-[10.5px] font-black text-mint-400"
                      : "inline-flex items-center gap-1 rounded-full border border-line bg-white/5 px-2.5 py-1 text-[10.5px] font-black text-fog-500"
                  }
                >
                  {serperEnabled ? <Wifi className="size-3" /> : <Satellite className="size-3" />}
                  {serperEnabled ? "رتبه‌گیری واقعی گوگل (Serper متصل)" : "رتبه‌گیری گوگل: حالت برآورد آفلاین"}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-fog-500">
                یک کلیک → اسکن همه شرکت‌ها، ردیابی گوگل، تولید گزارش سئو و پیشنهاد طراحی.
                {!serperEnabled && (
                  <span className="text-gold-300/80"> برای رتبه واقعی، متغیر SERPER_API_KEY را تنظیم کنید.</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => run(false)}
                disabled={running}
                className="group inline-flex items-center gap-2 rounded-xl bg-gold-400 px-6 py-3.5 text-sm font-black text-ink shadow-[0_8px_32px_rgba(242,169,59,0.35)] transition hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    در حال اسکن… {faInt(pct)}٪
                  </>
                ) : (
                  <>
                    <Play className="size-4 transition group-hover:scale-110" />
                    {phase === "done" ? "اسکن دوباره" : "راه‌اندازی اتوماسیون"}
                  </>
                )}
              </button>
              <button
                onClick={() => run(true)}
                disabled={running}
                title="تحلیل مجدد همه شرکت‌ها حتی اسکن‌شده‌ها"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong bg-white/[0.04] px-4 py-3.5 text-[12px] font-bold text-fog-300 transition hover:border-gold-400/50 hover:text-gold-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw className="size-3.5" />
                اسکن مجدد کامل
              </button>
            </div>
          </div>

          {progress.total > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-[11px] font-bold text-fog-500">
                <span>
                  {faInt(progress.done)} از {faInt(progress.total)} شرکت
                </span>
                <span className="flex items-center gap-1 text-gold-300">
                  <Crosshair className="size-3" />
                  {faInt(leadsFound)} لید شکار شده
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-gold-300 to-gold-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 min-h-28 rounded-2xl border border-line bg-ink/60 p-4">
            {logs.length === 0 ? (
              <p className="text-[12px] leading-6 text-fog-500">
                رادار آماده است. با هر اجرا، شرکت‌های نمایشگاه یکی‌یکی اسکن می‌شوند؛ آن‌هایی که
                سایت ندارند یا در صفحه اول گوگل نیستند به‌عنوان «لید» علامت می‌خورند و برای هر
                کدام گزارش پیشنهاد سئو و طراحی وب‌سایت ساخته می‌شود.
              </p>
            ) : (
              <ul className="space-y-1.5 font-mono text-[11.5px]" dir="rtl">
                <AnimatePresence initial={false}>
                  {logs.map((l) => (
                    <motion.li
                      key={l.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2"
                    >
                      {l.kind === "lead" ? (
                        <AlertTriangle className="size-3.5 shrink-0 text-rose-450" />
                      ) : l.kind === "ok" ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-mint-400" />
                      ) : (
                        <span className="size-1.5 shrink-0 rounded-full bg-gold-400" />
                      )}
                      <span
                        className={
                          l.kind === "lead"
                            ? "text-rose-450"
                            : l.kind === "ok"
                              ? "text-mint-400"
                              : "text-fog-300"
                        }
                      >
                        {l.text}
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
