import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { companies, exhibitions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import CompaniesTable from "@/components/CompaniesTable";
import ImportCompaniesForm from "@/components/ImportCompaniesForm";
import BulkCheckButton from "@/components/BulkCheckButton";
import Top10Panel from "@/components/Top10Panel";
import ExhibitionToolbar from "@/components/ExhibitionToolbar";
import { hasGoogleApiKey } from "@/lib/google-places";
import { hasAiKey } from "@/lib/ai-proposal";
import type { Company } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExhibitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exhibitionId = Number(id);
  if (!Number.isInteger(exhibitionId)) notFound();

  const [exhibition] = await db.select().from(exhibitions).where(eq(exhibitions.id, exhibitionId));
  if (!exhibition) notFound();

  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.exhibitionId, exhibitionId))
    .orderBy(desc(companies.priority), desc(companies.createdAt));

  const companyList = rows.map((r) => ({
    ...r,
    checkedAt: r.checkedAt ? r.checkedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })) as Company[];

  const apiKeyConfigured = hasGoogleApiKey();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <Link href="/" className="text-sm text-indigo-600 hover:underline">
        ← بازگشت به لیست نمایشگاه‌ها
      </Link>

      <header className="mt-4 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950 sm:text-3xl">{exhibition.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {exhibition.year ? `دوره ${exhibition.year} · ` : ""}
              {companyList.length} شرکت ثبت‌شده
              {exhibition.sourceUrl && (
                <>
                  {" · "}
                  <a href={exhibition.sourceUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">
                    منبع اصلی ↗
                  </a>
                </>
              )}
            </p>
          </div>
          <ExhibitionToolbar exhibitionId={exhibitionId} />
        </div>
      </header>

      <section className="mb-6">
        <Top10Panel exhibitionId={exhibitionId} />
      </section>

      {!apiKeyConfigured && (
        <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          کلید Google Places API تنظیم نشده است، بنابراین بررسی حضور در گوگل به‌صورت
          <strong> نیمه‌خودکار </strong>
          انجام می‌شود: با کلیک روی «بررسی گوگل»، جست‌وجوی مربوطه در تب جدید باز می‌شود و شما نتیجه را
          با یک کلیک ثبت می‌کنید.
        </section>
      )}

      {!hasAiKey() && (
        <section className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          کلید هوش مصنوعی (OPENAI_API_KEY) تنظیم نشده است؛ پیشنهادهای سئو با یک قالب آماده و از پیش
          نوشته‌شده تولید می‌شوند. با افزودن این کلید، پیشنهادها به‌صورت هوشمند و شخصی‌سازی‌شده با هوش
          مصنوعی بازنویسی خواهند شد.
        </section>
      )}

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <BulkCheckButton exhibitionId={exhibitionId} hasApiKey={apiKeyConfigured} />
        <ImportCompaniesForm exhibitionId={exhibitionId} />
      </section>

      <section>
        <CompaniesTable companies={companyList} hasApiKey={apiKeyConfigured} />
      </section>
    </main>
  );
}
