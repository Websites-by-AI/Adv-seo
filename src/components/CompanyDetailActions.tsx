"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { googleMapsSearchUrl } from "@/lib/maps-url";
import type { Company } from "@/lib/types";

const STATUS_LABEL: Record<Company["googleStatus"], string> = {
  not_checked: "بررسی نشده",
  found: "دارای پروفایل گوگل",
  not_found: "یافت نشد",
};

const STATUS_STYLE: Record<Company["googleStatus"], string> = {
  not_checked: "bg-amber-100 text-amber-700",
  found: "bg-emerald-100 text-emerald-700",
  not_found: "bg-rose-100 text-rose-700",
};

export default function CompanyDetailActions({
  company,
  hasApiKey,
}: {
  company: Company;
  hasApiKey: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [proposalMsg, setProposalMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function safeFetch(input: string, init?: RequestInit): Promise<boolean> {
    try {
      const res = await fetch(input, init);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
        return false;
      }
      setError(null);
      return true;
    } catch {
      setError("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.");
      return false;
    }
  }

  // window.open must happen synchronously in the click handler, otherwise
  // popup blockers silently drop it.
  function checkGoogle() {
    if (hasApiKey) {
      setLoading(true);
      safeFetch(`/api/companies/${company.id}/check-google`, { method: "POST" })
        .then((ok) => ok && router.refresh())
        .finally(() => setLoading(false));
      return;
    }

    const url = googleMapsSearchUrl(company.name, company.address);
    window.open(url, "_blank", "noopener,noreferrer");
    setManualUrl(url);
  }

  async function markManual(found: boolean) {
    setLoading(true);
    try {
      const ok = await safeFetch(`/api/companies/${company.id}/mark-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ found, mapsUrl: manualUrl }),
      });
      if (ok) {
        setManualUrl(null);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function generateProposal() {
    setLoading(true);
    setProposalMsg(null);
    try {
      const ok = await safeFetch(`/api/companies/${company.id}/proposal`, { method: "POST" });
      if (ok) {
        setProposalMsg("پیشنهاد جدید تولید شد.");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[company.googleStatus]}`}>
          وضعیت گوگل: {STATUS_LABEL[company.googleStatus]}
        </span>
        {company.googleMapsUrl && (
          <a href={company.googleMapsUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-500 hover:underline">
            مشاهده در نقشه گوگل ↗
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={checkGoogle}
          disabled={loading}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          {company.googleStatus === "not_checked"
            ? hasApiKey
              ? "بررسی خودکار در گوگل"
              : "بررسی در گوگل مپ (باز کردن نقشه)"
            : "بررسی مجدد در گوگل"}
        </button>
        <button
          onClick={generateProposal}
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          تولید پیشنهاد سئوی جدید
        </button>
      </div>

      {!hasApiKey && manualUrl && company.googleStatus === "not_checked" && (
        <div className="mt-4 rounded-xl bg-amber-50 p-4">
          <p className="mb-2 text-sm text-amber-800">
            نتیجه جست‌وجو را در تب جدید بررسی کرده و پاسخ را ثبت کنید:
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => markManual(true)}
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              پیدا شد
            </button>
            <button
              onClick={() => markManual(false)}
              disabled={loading}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              پیدا نشد
            </button>
          </div>
        </div>
      )}

      {proposalMsg && <p className="mt-3 text-sm text-emerald-600">{proposalMsg}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
