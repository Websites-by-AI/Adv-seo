"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportCompaniesForm({ exhibitionId }: { exhibitionId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"bulk" | "single">("bulk");

  const [text, setText] = useState("");

  const [single, setSingle] = useState({ name: "", phone: "", website: "", email: "", address: "", category: "" });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reportResult(data: { insertedCount: number; skippedDuplicates?: string[] }) {
    const dupCount = data.skippedDuplicates?.length ?? 0;
    setMessage(
      dupCount > 0
        ? `${data.insertedCount} شرکت اضافه شد؛ ${dupCount} مورد به دلیل تکراری‌بودن نادیده گرفته شد.`
        : `${data.insertedCount} شرکت اضافه شد.`,
    );
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("لیست شرکت‌ها را وارد کنید");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/exhibitions/${exhibitionId}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companiesText: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در افزودن شرکت‌ها");
      reportResult(data);
      setText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!single.name.trim()) {
      setError("نام شرکت را وارد کنید");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/exhibitions/${exhibitionId}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(single),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در افزودن شرکت");
      reportResult(data);
      setSingle({ name: "", phone: "", website: "", email: "", address: "", category: "" });
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
        className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
      >
        + افزودن شرکت‌های بیشتر
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-bold text-slate-800">افزودن شرکت</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-800">
          بستن ✕
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <TabButton active={mode === "bulk"} onClick={() => setMode("bulk")}>
          افزودن گروهی (چند خط)
        </TabButton>
        <TabButton active={mode === "single"} onClick={() => setMode("single")}>
          افزودن یک شرکت
        </TabButton>
      </div>

      {mode === "bulk" ? (
        <form onSubmit={handleBulkSubmit}>
          <p className="mb-2 text-xs text-slate-500">
            فرمت: نام شرکت | تلفن | وبسایت | آدرس | دسته‌بندی | ایمیل — تلفن، وبسایت و ایمیل به‌صورت
            هوشمند تشخیص داده می‌شوند؛ آدرس و دسته‌بندی به همین ترتیب خوانده می‌شوند. فقط نام هم کافیست.
            شرکت‌های تکراری خودکار نادیده گرفته می‌شوند.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={"شرکت الف | 021-11112222 | example.com\nشرکت ب"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "در حال افزودن..." : "افزودن شرکت‌ها"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSingleSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SingleField
              label="نام شرکت *"
              value={single.name}
              onChange={(v) => setSingle((s) => ({ ...s, name: v }))}
            />
            <SingleField
              label="تلفن"
              value={single.phone}
              onChange={(v) => setSingle((s) => ({ ...s, phone: v }))}
              dir="ltr"
            />
            <SingleField
              label="وبسایت"
              value={single.website}
              onChange={(v) => setSingle((s) => ({ ...s, website: v }))}
              dir="ltr"
            />
            <SingleField
              label="ایمیل"
              value={single.email}
              onChange={(v) => setSingle((s) => ({ ...s, email: v }))}
              dir="ltr"
            />
            <SingleField
              label="دسته‌بندی"
              value={single.category}
              onChange={(v) => setSingle((s) => ({ ...s, category: v }))}
            />
            <SingleField
              label="آدرس"
              value={single.address}
              onChange={(v) => setSingle((s) => ({ ...s, address: v }))}
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "در حال افزودن..." : "افزودن شرکت"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function SingleField({
  label,
  value,
  onChange,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );
}
