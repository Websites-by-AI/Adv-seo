import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { companies, exhibitions, proposals } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import CompanyDetailActions from "@/components/CompanyDetailActions";
import EditCompanyForm from "@/components/EditCompanyForm";
import ProposalCard from "@/components/ProposalCard";
import { hasGoogleApiKey } from "@/lib/google-places";
import type { Company, Proposal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) notFound();

  const [row] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!row) notFound();

  const [exhibition] = await db.select().from(exhibitions).where(eq(exhibitions.id, row.exhibitionId));

  const proposalRows = await db
    .select()
    .from(proposals)
    .where(eq(proposals.companyId, companyId))
    .orderBy(desc(proposals.createdAt));

  const company: Company = {
    ...row,
    checkedAt: row.checkedAt ? row.checkedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  const proposalList: Proposal[] = proposalRows.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      {exhibition && (
        <Link href={`/exhibitions/${exhibition.id}`} className="text-sm text-indigo-600 hover:underline">
          ← بازگشت به {exhibition.title}
        </Link>
      )}

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-extrabold text-slate-950 sm:text-3xl">{company.name}</h1>
        {company.category && <p className="mt-1 text-sm text-slate-500">{company.category}</p>}
      </header>

      <section className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <InfoRow label="تلفن" value={company.phone} dir="ltr" />
        <InfoRow
          label="وبسایت"
          value={company.website}
          dir="ltr"
          href={company.website ? (company.website.startsWith("http") ? company.website : `https://${company.website}`) : undefined}
        />
        <InfoRow label="ایمیل" value={company.email} dir="ltr" />
        <InfoRow label="آدرس" value={company.address} />
      </section>

      {company.notes && (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="mb-1 text-xs font-semibold text-amber-700">یادداشت</p>
          <p className="whitespace-pre-wrap text-sm text-amber-900">{company.notes}</p>
        </section>
      )}

      <section className="mb-6">
        <CompanyDetailActions company={company} hasApiKey={hasGoogleApiKey()} />
      </section>

      <section className="mb-8">
        <EditCompanyForm company={company} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">پیشنهادهای سئو تولیدشده</h2>
        {proposalList.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            هنوز پیشنهادی برای این شرکت تولید نشده است.
          </p>
        ) : (
          <div className="space-y-4">
            {proposalList.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function InfoRow({
  label,
  value,
  dir,
  href,
}: {
  label: string;
  value: string | null;
  dir?: "ltr" | "rtl";
  href?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      {value ? (
        href ? (
          <a href={href} target="_blank" rel="noreferrer" dir={dir} className="text-sm text-indigo-600 hover:underline">
            {value}
          </a>
        ) : (
          <p dir={dir} className="text-sm text-slate-800">
            {value}
          </p>
        )
      ) : (
        <p className="text-sm text-slate-400">—</p>
      )}
    </div>
  );
}
