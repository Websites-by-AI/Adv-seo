"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Proposal } from "@/lib/types";

export default function ProposalCard({ proposal }: { proposal: Proposal }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  async function toggleStatus() {
    setStatusLoading(true);
    try {
      const nextStatus = proposal.status === "sent" ? "draft" : "sent";
      await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      router.refresh();
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(proposal.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function handlePrint() {
    const win = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
    if (!win) return;
    win.document.write(`
      <html dir="rtl" lang="fa-IR">
        <head>
          <meta charset="utf-8" />
          <title>پیشنهاد سئو</title>
          <style>
            body { font-family: Tahoma, sans-serif; padding: 32px; line-height: 1.9; white-space: pre-wrap; }
          </style>
        </head>
        <body>${escapeHtml(proposal.content)}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {new Date(proposal.createdAt).toLocaleString("fa-IR")}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              proposal.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {proposal.status === "sent" ? "ارسال شده" : "پیش‌نویس"}
          </span>
          {proposal.aiGenerated && (
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              ✨ تولید با هوش مصنوعی
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleStatus}
            disabled={statusLoading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {proposal.status === "sent" ? "بازگرداندن به پیش‌نویس" : "علامت‌گذاری به‌عنوان ارسال‌شده"}
          </button>
          <button
            onClick={handleCopy}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {copied ? "کپی شد ✓" : "کپی متن"}
          </button>
          <button
            onClick={handlePrint}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            چاپ / PDF
          </button>
        </div>
      </div>
      <pre className="whitespace-pre-wrap font-[inherit] text-sm leading-8 text-slate-800">{proposal.content}</pre>
    </div>
  );
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}
