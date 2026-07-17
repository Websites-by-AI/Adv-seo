"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Company } from "@/lib/types";

export default function Top10Panel({ exhibitionId }: { exhibitionId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [top10, setTop10] = useState<Company[] | null>(null);
  const [generated, setGenerated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/exhibitions/${exhibitionId}/top10`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error || "خطا در تولید پیشنهادها. لطفاً دوباره تلاش کنید.");
        return;
      }
      setTop10(data.top10 || []);
      setGenerated(data.generated ?? 0);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-indigo-900">پیشنهاد سئو برای ۱۰ شرکت اول</h3>
          <p className="mt-1 text-sm text-indigo-800/80">
            شرکت‌هایی که تأیید شده در Google Maps نیستند را به ترتیب اولویت انتخاب کرده و برای هرکدام
            یک پیشنهاد آماده بهبود سئو تولید می‌کند.
          </p>
        </div>
        <button
          onClick={handleClick}
          disabled={loading}
          className="whitespace-nowrap rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "در حال تولید..." : "تولید پیشنهاد برای ۱۰ شرکت اول"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {top10 && (
        <div className="mt-5">
          {generated !== null && (
            <p className="mb-3 text-xs font-semibold text-indigo-700">
              {generated} پیشنهاد جدید تولید شد (مجموع نمایش‌داده‌شده: {top10.length})
            </p>
          )}
          {top10.length === 0 ? (
            <p className="text-sm text-indigo-700/70">
              فعلاً هیچ شرکت تأییدشده‌ای با وضعیت «یافت‌نشده در گوگل» وجود ندارد. ابتدا شرکت‌ها را بررسی کنید.
            </p>
          ) : (
            <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {top10.map((c, i) => (
                <li key={c.id} className="rounded-xl border border-indigo-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/companies/${c.id}`} className="font-semibold text-indigo-800 hover:underline">
                      {i + 1}. {c.name}
                    </Link>
                  </div>
                  {c.phone && (
                    <p dir="ltr" className="mt-1 text-right text-xs text-slate-500">
                      {c.phone}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
