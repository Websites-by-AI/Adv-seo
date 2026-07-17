"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, Send, Trophy, X, Sparkle, ChevronDown } from "lucide-react";
import { LEAD_STAGES, type LeadStage } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<LeadStage, string> = {
  new: "border-gold-400/30 bg-gold-400/10 text-gold-300",
  contacted: "border-[#7FB5FF]/30 bg-[#7FB5FF]/10 text-[#7FB5FF]",
  proposal: "border-[#C6A6FF]/30 bg-[#C6A6FF]/10 text-[#C6A6FF]",
  won: "border-mint-400/30 bg-mint-400/10 text-mint-400",
  lost: "border-rose-450/30 bg-rose-450/10 text-rose-450",
};

const DOT: Record<LeadStage, string> = {
  new: "bg-gold-400",
  contacted: "bg-[#7FB5FF]",
  proposal: "bg-[#C6A6FF]",
  won: "bg-mint-400",
  lost: "bg-rose-450",
};

const ICON: Record<LeadStage, typeof Sparkle> = {
  new: Sparkle,
  contacted: PhoneCall,
  proposal: Send,
  won: Trophy,
  lost: X,
};

export default function StageSelect({
  id,
  stage,
  compact = false,
}: {
  id: number;
  stage: LeadStage;
  compact?: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<LeadStage>(stage);
  const [pending, start] = useTransition();

  function update(next: LeadStage) {
    if (next === current) return;
    setCurrent(next);
    start(async () => {
      await fetch(`/api/companies/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: next }),
      });
      router.refresh();
    });
  }

  if (compact) {
    const Icon = ICON[current];
    return (
      <div
        className={cn(
          "relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold",
          TONE[current],
          pending && "opacity-60"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Icon className="size-3" />
        <select
          value={current}
          onChange={(e) => update(e.target.value as LeadStage)}
          className="cursor-pointer appearance-none bg-transparent pr-1 outline-none [&>option]:bg-panel [&>option]:text-white"
          aria-label="وضعیت پیگیری لید"
        >
          {LEAD_STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <ChevronDown className="size-3 opacity-60" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {LEAD_STAGES.map((s, i) => {
        const Icon = ICON[s.key];
        const active = s.key === current;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => update(s.key)}
              disabled={pending}
              title={s.hint}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition disabled:opacity-60",
                active
                  ? TONE[s.key] + " ring-1 ring-current"
                  : "border-line bg-white/[0.03] text-fog-500 hover:border-line-strong hover:text-fog-300"
              )}
            >
              <Icon className="size-3" />
              {s.label}
            </button>
            {i < LEAD_STAGES.length - 1 && <span className="h-px w-3 bg-line" />}
          </div>
        );
      })}
    </div>
  );
}
