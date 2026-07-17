"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyButton({ text, label = "کپی" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      onClick={copy}
      className={
        copied
          ? "inline-flex items-center gap-1.5 rounded-lg border border-mint-400/40 bg-mint-400/10 px-3 py-1.5 text-[11px] font-bold text-mint-400 transition"
          : "inline-flex items-center gap-1.5 rounded-lg border border-line bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-fog-300 transition hover:border-gold-400/40 hover:text-gold-300"
      }
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "کپی شد" : label}
    </button>
  );
}
