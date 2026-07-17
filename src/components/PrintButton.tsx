"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-xl border border-line-strong bg-white/[0.04] px-5 py-2.5 text-[12.5px] font-bold text-fog-300 transition hover:border-gold-400/50 hover:text-gold-300"
    >
      <Printer className="size-4" />
      خروجی PDF / چاپ گزارش
    </button>
  );
}
