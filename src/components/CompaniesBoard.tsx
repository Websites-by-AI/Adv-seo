"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe2,
  Search,
  Building2,
  Clock3,
  Flame,
  Trophy,
  GlobeOff,
  LayoutList,
} from "lucide-react";
import type { LeadView } from "@/lib/types";
import AnalyzeButton from "@/components/AnalyzeButton";
import StageSelect from "@/components/StageSelect";
import { ScoreRing } from "@/components/motion";
import { faInt, scoreTone, toneColor, cn } from "@/lib/utils";

type Filter = "all" | "leads" | "no-site" | "page-one" | "pending" | "won";

const FILTERS: { key: Filter; label: string; icon: typeof Flame }[] = [
  { key: "all", label: "همه شرکت‌ها", icon: LayoutList },
  { key: "leads", label: "لیدها: غایب از صفحه اول", icon: Flame },
  { key: "no-site", label: "بدون وب‌سایت", icon: GlobeOff },
  { key: "page-one", label: "در صفحه اول", icon: Trophy },
  { key: "pending", label: "در انتظار تحلیل", icon: Clock3 },
  { key: "won", label: "قرارداد بسته شد", icon: Trophy },
];

function rankLabel(c: LeadView): { text: string; cls: string } {
  if (c.status === "pending" || !c.report) return { text: "—", cls: "text-fog-500" };
  if (c.report.onPageOne && c.report.googleRank)
    return { text: `رتبه ${faInt(c.report.googleRank)}`, cls: "text-mint-400" };
  if (c.report.googleRank) return { text: `رتبه ${faInt(c.report.googleRank)}`, cls: "text-gold-300" };
  return { text: "خارج از ۵۰", cls: "text-rose-450" };
}

export default function CompaniesBoard({ rows }: { rows: LeadView[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let list = rows;
    if (q.trim()) {
      const t = q.trim();
      list = list.filter(
        (r) => r.name.includes(t) || r.category.includes(t) || r.city.includes(t)
      );
    }
    switch (filter) {
      case "leads":
        return list.filter((r) => r.status === "analyzed" && !r.report?.onPageOne);
      case "no-site":
        return list.filter((r) => !r.website);
      case "page-one":
        return list.filter((r) => r.report?.onPageOne);
      case "pending":
        return list.filter((r) => r.status === "pending");
      case "won":
        return list.filter((r) => r.stage === "won");
      default:
        return list;
    }
  }, [rows, filter, q]);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-bold transition",
                filter === f.key
                  ? "border-gold-400/60 bg-gold-400/15 text-gold-300"
                  : "border-line bg-panel text-fog-500 hover:border-line-strong hover:text-fog-300"
              )}
            >
              <f.icon className="size-3.5" />
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fog-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جست‌وجو: نام، دسته، شهر…"
            className="w-full rounded-xl border border-line bg-panel py-2.5 pr-10 pl-4 text-[13px] text-white outline-none transition placeholder:text-fog-500 focus:border-gold-400/50"
          />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-panel/60">
        <table className="w-full min-w-[940px] text-right text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] text-fog-500">
              <th className="px-4 py-3.5 font-bold">شرکت</th>
              <th className="px-4 py-3.5 font-bold">شهر / غرفه</th>
              <th className="px-4 py-3.5 font-bold">وب‌سایت</th>
              <th className="px-4 py-3.5 font-bold">وضعیت اسکن</th>
              <th className="px-4 py-3.5 font-bold">پیگیری</th>
              <th className="px-4 py-3.5 font-bold">رتبه گوگل</th>
              <th className="px-4 py-3.5 font-bold">امتیاز سئو</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const rank = rankLabel(c);
              const tone = c.report ? scoreTone(c.report.seoScore) : null;
              return (
                <tr
                  key={c.id}
                  className="group border-b border-line/60 transition last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-ink text-gold-400">
                        <Building2 className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-black">{c.name}</div>
                        <div className="text-[11px] text-fog-500">{c.category || "دسته ثبت نشده"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-fog-300">{c.city || "نامشخص"}</div>
                    <div className="text-[11px] text-fog-500">{c.booth || "—"}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    {c.website ? (
                      <span className="inline-flex items-center gap-1.5 text-fog-300" dir="ltr">
                        <Globe2 className="size-3.5 text-mint-400" />
                        <span className="text-[11px]" style={{ direction: "ltr" }}>
                          {c.website.replace(/^https?:\/\//, "")}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-rose-450">
                        <GlobeOff className="size-3.5" />
                        <span className="text-[11.5px] font-bold">ندارد</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {c.status === "analyzed" ? (
                      c.report?.onPageOne ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-mint-400/30 bg-mint-400/10 px-2.5 py-1 text-[10.5px] font-bold text-mint-400">
                          <Trophy className="size-3" />
                          صفحه اول
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-450/30 bg-rose-450/10 px-2.5 py-1 text-[10.5px] font-bold text-rose-450">
                          <Flame className="size-3" />
                          لید
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-white/5 px-2.5 py-1 text-[10.5px] font-bold text-fog-500">
                        <Clock3 className="size-3" />
                        در انتظار
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <StageSelect id={c.id} stage={c.stage} compact />
                  </td>
                  <td className={`px-4 py-3.5 font-black tabular-nums ${rank.cls}`}>{rank.text}</td>
                  <td className="px-4 py-3.5">
                    {c.report ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="bar-grow h-full rounded-full"
                            style={{
                              width: `${c.report.seoScore}%`,
                              background: tone ? toneColor[tone] : "#888",
                            }}
                          />
                        </div>
                        <span className="font-black tabular-nums" style={{ color: tone ? toneColor[tone] : "#888" }}>
                          {faInt(c.report.seoScore)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-fog-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {c.status === "pending" ? (
                        <AnalyzeButton id={c.id} compact />
                      ) : (
                        <Link
                          href={`/companies/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white/[0.03] px-3 py-1.5 text-[11px] font-bold text-fog-300 transition hover:border-gold-400/40 hover:text-gold-300"
                        >
                          گزارش
                          <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="grid place-items-center gap-3 px-6 py-16 text-center">
            <ScoreRing score={0} size={56} stroke={5} />
            <p className="text-[13px] text-fog-500">موردی مطابق فیلترها پیدا نشد.</p>
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-fog-500">
        {faInt(filtered.length)} شرکت نمایش داده شد از مجموع {faInt(rows.length)}.
      </p>
    </div>
  );
}
