import Link from "next/link";
import { ArrowLeft, Crosshair, GlobeOff, SearchX, TrendingDown } from "lucide-react";
import type { LeadView } from "@/lib/types";
import { ScoreRing } from "@/components/motion";
import { faInt } from "@/lib/utils";

export function leadProblems(c: LeadView): { icon: typeof Crosshair; label: string }[] {
  const out: { icon: typeof Crosshair; label: string }[] = [];
  if (!c.website) out.push({ icon: GlobeOff, label: "سایت ندارد" });
  if (c.report && c.report.googleRank === null && c.website)
    out.push({ icon: SearchX, label: "در ۱۰۰ نتیجه اول نیست" });
  if (c.report && c.report.googleRank !== null && !c.report.onPageOne)
    out.push({ icon: TrendingDown, label: `رتبه ${faInt(c.report.googleRank)}` });
  return out.slice(0, 1);
}

export default function LeadCard({ company, index }: { company: LeadView; index: number }) {
  const problems = leadProblems(company);
  return (
    <Link
      href={`/companies/${company.id}`}
      className="card-surface group flex flex-col gap-4 rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-fog-500">
            لید شماره {faInt(index + 1)} · {company.booth}
          </div>
          <h3 className="mt-1 truncate text-[16px] font-black group-hover:text-gold-300">
            {company.name}
          </h3>
          <div className="mt-0.5 text-[11.5px] text-fog-500">
            {company.category} · {company.city}
          </div>
        </div>
        <ScoreRing score={company.report?.seoScore ?? 0} size={62} stroke={6} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {problems.map((p) => (
          <span
            key={p.label}
            className="inline-flex items-center gap-1 rounded-full border border-rose-450/30 bg-rose-450/10 px-2.5 py-1 text-[10.5px] font-bold text-rose-450"
          >
            <p.icon className="size-3" />
            {p.label}
          </span>
        ))}
        {company.report && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/25 bg-gold-400/10 px-2.5 py-1 text-[10.5px] font-bold text-gold-300">
            <Crosshair className="size-3" />
            فرصت فروش {faInt(company.report.opportunity)}٪
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-[11px] font-bold">
        <span className="text-fog-500">گزارش کامل + پیشنهاد طراحی سایت</span>
        <span className="flex items-center gap-1 text-gold-400">
          مشاهده
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
