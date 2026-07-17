"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { googleMapsSearchUrl } from "@/lib/maps-url";
import type { Company, GoogleStatus } from "@/lib/types";

const STATUS_LABEL: Record<GoogleStatus, string> = {
  not_checked: "بررسی نشده",
  found: "دارای پروفایل گوگل",
  not_found: "یافت نشد",
};

const STATUS_STYLE: Record<GoogleStatus, string> = {
  not_checked: "bg-amber-100 text-amber-700",
  found: "bg-emerald-100 text-emerald-700",
  not_found: "bg-rose-100 text-rose-700",
};

type Filter = "all" | GoogleStatus;

export default function CompaniesTable({
  companies,
  hasApiKey,
}: {
  companies: Company[];
  hasApiKey: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingManual, setPendingManual] = useState<Record<number, string>>({});
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const PAGE_SIZE = 25;

  async function safeFetch(input: string, init?: RequestInit): Promise<boolean> {
    try {
      const res = await fetch(input, init);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setActionError(data?.error || "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
        return false;
      }
      setActionError(null);
      return true;
    } catch {
      setActionError("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.");
      return false;
    }
  }

  const filtered = useMemo(() => {
    let list = filter === "all" ? companies : companies.filter((c) => c.googleStatus === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q) ||
          (c.category || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [companies, filter, query]);

  // Reset back to page 1 whenever the active filter/search changes so the
  // user doesn't end up looking at an out-of-range empty page.
  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  function changeFilter(f: Filter) {
    setFilter(f);
    setPage(1);
  }

  function changeQuery(q: string) {
    setQuery(q);
    setPage(1);
  }

  const counts = useMemo(() => {
    return companies.reduce(
      (acc, c) => {
        acc[c.googleStatus]++;
        return acc;
      },
      { not_checked: 0, found: 0, not_found: 0 } as Record<GoogleStatus, number>,
    );
  }, [companies]);

  // IMPORTANT: window.open must be called synchronously inside the click
  // handler (before any `await`), otherwise browsers treat it as a
  // background popup and silently block it.
  function checkGoogle(company: Company) {
    if (hasApiKey) {
      setBusyId(company.id);
      safeFetch(`/api/companies/${company.id}/check-google`, { method: "POST" })
        .then((ok) => ok && startTransition(() => router.refresh()))
        .finally(() => setBusyId(null));
      return;
    }

    const url = googleMapsSearchUrl(company.name, company.address);
    window.open(url, "_blank", "noopener,noreferrer");
    setPendingManual((prev) => ({ ...prev, [company.id]: url }));
  }

  async function markManual(id: number, found: boolean) {
    setBusyId(id);
    try {
      const ok = await safeFetch(`/api/companies/${id}/mark-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ found, mapsUrl: pendingManual[id] }),
      });
      if (ok) {
        setPendingManual((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        startTransition(() => router.refresh());
      }
    } finally {
      setBusyId(null);
    }
  }

  async function generateProposal(id: number) {
    setBusyId(id);
    try {
      const ok = await safeFetch(`/api/companies/${id}/proposal`, { method: "POST" });
      if (ok) startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCompany(id: number) {
    if (!confirm("این شرکت حذف شود؟")) return;
    setBusyId(id);
    try {
      const ok = await safeFetch(`/api/companies/${id}`, { method: "DELETE" });
      if (ok) startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {actionError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-800">
            ✕
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterButton active={filter === "all"} onClick={() => changeFilter("all")}>
            همه ({companies.length})
          </FilterButton>
          <FilterButton active={filter === "not_found"} onClick={() => changeFilter("not_found")}>
            یافت‌نشده در گوگل ({counts.not_found})
          </FilterButton>
          <FilterButton active={filter === "found"} onClick={() => changeFilter("found")}>
            دارای پروفایل گوگل ({counts.found})
          </FilterButton>
          <FilterButton active={filter === "not_checked"} onClick={() => changeFilter("not_checked")}>
            بررسی‌نشده ({counts.not_checked})
          </FilterButton>
        </div>
        <input
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          placeholder="جست‌وجوی نام، تلفن یا دسته‌بندی..."
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="px-4 py-3 text-right font-semibold">نام شرکت</th>
              <th className="px-4 py-3 text-right font-semibold">تماس</th>
              <th className="px-4 py-3 text-right font-semibold">وضعیت گوگل</th>
              <th className="px-4 py-3 text-right font-semibold">اقدامات</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((c) => {
              const manualUrl = pendingManual[c.id];
              const busy = busyId === c.id || isPending;
              return (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.id}`} className="font-semibold text-indigo-700 hover:underline">
                      {c.name}
                    </Link>
                    {c.notes && (
                      <span
                        title={c.notes}
                        className="mr-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                      >
                        یادداشت
                      </span>
                    )}
                    {c.category && <div className="mt-0.5 text-xs text-slate-500">{c.category}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div dir="ltr" className="text-right">
                      {c.phone || "—"}
                    </div>
                    {c.website && (
                      <a
                        href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noreferrer"
                        dir="ltr"
                        className="text-xs text-indigo-500 hover:underline"
                      >
                        {c.website}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[c.googleStatus]}`}>
                      {STATUS_LABEL[c.googleStatus]}
                    </span>
                    {c.googleMapsUrl && c.googleStatus !== "not_checked" && (
                      <a
                        href={c.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-xs text-slate-400 hover:text-indigo-500"
                      >
                        مشاهده در نقشه ↗
                      </a>
                    )}
                    {manualUrl && c.googleStatus === "not_checked" && (
                      <div className="mt-2 flex flex-col items-start gap-1">
                        <a
                          href={manualUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-500 hover:underline"
                        >
                          باز کردن دوباره نقشه ↗
                        </a>
                        <div className="flex gap-1">
                          <button
                            onClick={() => markManual(c.id, true)}
                            disabled={busy}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            یافت شد
                          </button>
                          <button
                            onClick={() => markManual(c.id, false)}
                            disabled={busy}
                            className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            یافت نشد
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => checkGoogle(c)}
                        disabled={busy}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      >
                        {c.googleStatus === "not_checked"
                          ? hasApiKey
                            ? "بررسی خودکار گوگل"
                            : "بررسی گوگل (باز کردن نقشه)"
                          : "بررسی مجدد"}
                      </button>
                      {c.googleStatus === "not_found" && (
                        <button
                          onClick={() => generateProposal(c.id)}
                          disabled={busy}
                          className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          تولید پیشنهاد سئو
                        </button>
                      )}
                      <button
                        onClick={() => deleteCompany(c.id)}
                        disabled={busy}
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  موردی برای نمایش وجود ندارد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            نمایش {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} از{" "}
            {filtered.length} شرکت
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={safePage <= 1}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              قبلی
            </button>
            <span className="px-2 py-1.5 text-xs text-slate-500">
              صفحه {safePage} از {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={safePage >= totalPages}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              بعدی
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterButton({
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
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
        active ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
