"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExhibitionToolbar({ exhibitionId }: { exhibitionId: number }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("این نمایشگاه و همه‌ی شرکت‌ها و پیشنهادهای مرتبط با آن حذف شود؟ این عمل قابل بازگشت نیست.")) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/exhibitions/${exhibitionId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("حذف نمایشگاه با خطا مواجه شد. لطفاً دوباره تلاش کنید.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/api/exhibitions/${exhibitionId}/export`}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          خروجی CSV (همه)
        </a>
        <a
          href={`/api/exhibitions/${exhibitionId}/export?status=not_found`}
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          خروجی CSV (فقط بدون گوگل)
        </a>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-60"
        >
          {deleting ? "در حال حذف..." : "حذف نمایشگاه"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
