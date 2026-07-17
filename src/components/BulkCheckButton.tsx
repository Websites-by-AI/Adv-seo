"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { googleMapsSearchUrl } from "@/lib/maps-url";
import type { Company } from "@/lib/types";

export default function BulkCheckButton({
  exhibitionId,
  hasApiKey,
}: {
  exhibitionId: number;
  hasApiKey: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Company[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    setError(null);
    setQueue(null);
    try {
      if (hasApiKey) {
        let totalChecked = 0;
        let remaining = 1;
        while (remaining > 0) {
          const res = await fetch(`/api/exhibitions/${exhibitionId}/bulk-check`, { method: "POST" });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data) {
            setError(data?.error || "خطا در بررسی گروهی. لطفاً دوباره تلاش کنید.");
            break;
          }
          totalChecked += data.checked ?? 0;
          remaining = data.remaining ?? 0;
          setResult(`${totalChecked} شرکت بررسی شد${remaining > 0 ? " (در حال ادامه...)" : ""}`);
          router.refresh();
          if ((data.checked ?? 0) === 0) break; // safety valve against infinite loop
        }
        return;
      }

      // No API key: build a manual review queue of every "not checked"
      // company in this exhibition, so the user can click through them one
      // by one, opening the map search and recording the result.
      const res = await fetch(`/api/exhibitions/${exhibitionId}/companies`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError("خطا در دریافت لیست شرکت‌ها.");
        return;
      }
      const pending: Company[] = (data.companies || []).filter(
        (c: Company) => c.googleStatus === "not_checked",
      );
      setQueue(pending);
      if (pending.length === 0) {
        setResult("هیچ شرکت بررسی‌نشده‌ای باقی نمانده است.");
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }

  function openMap(company: Company) {
    const url = googleMapsSearchUrl(company.name, company.address);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function mark(company: Company, found: boolean) {
    setBusyId(company.id);
    try {
      const url = googleMapsSearchUrl(company.name, company.address);
      const res = await fetch(`/api/companies/${company.id}/mark-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ found, mapsUrl: url }),
      });
      if (!res.ok) {
        setError("ثبت نتیجه با خطا مواجه شد.");
        return;
      }
      setQueue((prev) => (prev ? prev.filter((c) => c.id !== company.id) : prev));
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-start gap-1.5">
        <button
          onClick={handleClick}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading
            ? "در حال بررسی..."
            : hasApiKey
              ? "بررسی گروهی همه‌ی شرکت‌های بررسی‌نشده"
              : "شروع بررسی دستی شرکت‌های بررسی‌نشده"}
        </button>
        {result && <p className="text-xs text-slate-500">{result}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {queue && queue.length > 0 && (
        <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            {queue.length} شرکت باقی مانده — برای هرکدام نقشه را باز کنید و نتیجه را ثبت کنید:
          </p>
          <ul className="space-y-2">
            {queue.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-slate-800">{c.name}</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => openMap(c)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    باز کردن نقشه ↗
                  </button>
                  <button
                    onClick={() => mark(c, true)}
                    disabled={busyId === c.id}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    یافت شد
                  </button>
                  <button
                    onClick={() => mark(c, false)}
                    disabled={busyId === c.id}
                    className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    یافت نشد
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
