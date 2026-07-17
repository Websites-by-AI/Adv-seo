import Link from "next/link";
import { db } from "@/db";
import { exhibitions, companies } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import NewExhibitionForm from "@/components/NewExhibitionForm";

export const dynamic = "force-dynamic";

async function getExhibitions() {
  return db
    .select({
      id: exhibitions.id,
      title: exhibitions.title,
      sourceUrl: exhibitions.sourceUrl,
      year: exhibitions.year,
      createdAt: exhibitions.createdAt,
      companyCount: sql<number>`count(${companies.id})::int`,
      notFoundCount: sql<number>`count(${companies.id}) filter (where ${companies.googleStatus} = 'not_found')::int`,
      foundCount: sql<number>`count(${companies.id}) filter (where ${companies.googleStatus} = 'found')::int`,
      notCheckedCount: sql<number>`count(${companies.id}) filter (where ${companies.googleStatus} = 'not_checked')::int`,
    })
    .from(exhibitions)
    .leftJoin(companies, eq(companies.exhibitionId, exhibitions.id))
    .groupBy(exhibitions.id)
    .orderBy(desc(exhibitions.createdAt));
}

export default async function HomePage() {
  const list = await getExhibitions();

  const totals = list.reduce(
    (acc, e) => {
      acc.companies += e.companyCount;
      acc.notFound += e.notFoundCount;
      acc.found += e.foundCount;
      return acc;
    },
    { companies: 0, notFound: 0, found: 0 },
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="mb-10">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">
          اتوماسیون شناسایی مشتری بالقوه
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
          شرکت‌های نمایشگاهی بدون حضور در گوگل مپ
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          لیست شرکت‌کنندگان نمایشگاه‌ها را وارد کنید، ابزار به‌صورت خودکار بررسی می‌کند کدام‌یک در
          Google Maps ثبت نشده‌اند، سپس برای ۱۰ شرکت اول یک پیشنهاد آماده‌ی بهبود سئو و صفحه گوگل
          تولید می‌کند.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="نمایشگاه‌ها" value={list.length} color="bg-slate-900" />
        <StatCard label="کل شرکت‌ها" value={totals.companies} color="bg-indigo-600" />
        <StatCard label="یافت‌نشده در گوگل" value={totals.notFound} color="bg-rose-600" />
        <StatCard label="دارای پروفایل گوگل" value={totals.found} color="bg-emerald-600" />
      </section>

      <section className="mb-8">
        <NewExhibitionForm />
      </section>

      <section className="space-y-4">
        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            هنوز نمایشگاهی ثبت نشده است. با دکمه‌ی بالا اولین نمایشگاه را اضافه کنید.
          </div>
        )}

        {list.map((ex) => (
          <Link
            key={ex.id}
            href={`/exhibitions/${ex.id}`}
            className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{ex.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {ex.year ? `دوره ${ex.year} · ` : ""}
                  {new Date(ex.createdAt).toLocaleDateString("fa-IR")}
                </p>
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  {ex.companyCount} شرکت
                </span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">
                  {ex.notFoundCount} بدون گوگل
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                  {ex.foundCount} دارای گوگل
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                  {ex.notCheckedCount} بررسی‌نشده
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 h-1.5 w-10 rounded-full ${color}`} />
      <p className="text-2xl font-extrabold text-slate-950">{value.toLocaleString("fa-IR")}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
