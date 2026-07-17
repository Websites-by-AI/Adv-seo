"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

export default function AnalyzeButton({ id, compact = false }: { id: number; compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function analyze(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={analyze}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-lg border border-gold-400/30 bg-gold-400/10 px-2.5 py-1.5 text-[11px] font-bold text-gold-300 transition hover:bg-gold-400/20 disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
        تحلیل
      </button>
    );
  }

  return (
    <button
      onClick={analyze}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-7 py-3.5 text-sm font-black text-ink shadow-[0_8px_32px_rgba(242,169,59,0.35)] transition hover:bg-gold-300 disabled:opacity-60"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
      {loading ? "در حال اسکن و تولید گزارش…" : "اجرای تحلیل برای این شرکت"}
    </button>
  );
}
