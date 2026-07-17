"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Company } from "@/lib/types";

export default function EditCompanyForm({ company }: { company: Company }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: company.name,
    phone: company.phone ?? "",
    website: company.website ?? "",
    email: company.email ?? "",
    address: company.address ?? "",
    category: company.category ?? "",
    notes: company.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("نام شرکت نمی‌تواند خالی باشد");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ذخیره تغییرات");
      setOpen(false);
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
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        ویرایش اطلاعات شرکت
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-slate-800">ویرایش اطلاعات شرکت</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-800">
          بستن ✕
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="نام شرکت" value={form.name} onChange={(v) => update("name", v)} required />
        <Field label="تلفن" value={form.phone} onChange={(v) => update("phone", v)} dir="ltr" />
        <Field label="وبسایت" value={form.website} onChange={(v) => update("website", v)} dir="ltr" />
        <Field label="ایمیل" value={form.email} onChange={(v) => update("email", v)} dir="ltr" />
        <Field label="دسته‌بندی" value={form.category} onChange={(v) => update("category", v)} />
        <Field label="آدرس" value={form.address} onChange={(v) => update("address", v)} />
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">یادداشت</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  dir,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "ltr" | "rtl";
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );
}
