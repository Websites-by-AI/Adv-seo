"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewExhibitionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [companiesText, setCompaniesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("عنوان نمایشگاه را وارد کنید");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/exhibitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, year, sourceUrl, companiesText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ایجاد نمایشگاه");
      setTitle("");
      setYear("");
      setSourceUrl("");
      setCompaniesText("");
      setOpen(false);
      router.push(`/exhibitions/${data.exhibition.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700"
      >
        + افزودن نمایشگاه جدید
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">نمایشگاه جدید</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          بستن ✕
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            عنوان نمایشگاه <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="نمایشگاه درب و پنجره تهران ۱۴۰۴"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">سال / دوره</label>
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="۱۴۰۴"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">لینک منبع (اختیاری)</label>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://iranadfair.com/ad_category/..."
            dir="ltr"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-left focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            لیست شرکت‌ها (اختیاری - هر خط یک شرکت)
          </label>
          <p className="mb-2 text-xs text-slate-500">
            فرمت هر خط: نام شرکت | تلفن | وبسایت | آدرس | دسته‌بندی | ایمیل — تلفن، وبسایت و ایمیل به‌صورت
            هوشمند تشخیص داده می‌شوند؛ آدرس و دسته‌بندی به همین ترتیب (اول آدرس، بعد دسته‌بندی) خوانده
            می‌شوند. فقط نام هم کافیست.
          </p>
          <textarea
            value={companiesText}
            onChange={(e) => setCompaniesText(e.target.value)}
            rows={6}
            placeholder={"شرکت الف | 021-11112222 | example.com\nشرکت ب | 026-33334444"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "در حال ایجاد..." : "ایجاد نمایشگاه"}
        </button>
      </div>
    </form>
  );
}
