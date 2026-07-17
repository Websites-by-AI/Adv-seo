import { NextResponse } from "next/server";
import { db } from "@/db";
import { exhibitions, companies } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { parseCompaniesText, dedupeCompanies } from "@/lib/parse-companies";

export async function GET() {
  const rows = await db
    .select({
      id: exhibitions.id,
      title: exhibitions.title,
      sourceUrl: exhibitions.sourceUrl,
      year: exhibitions.year,
      createdAt: exhibitions.createdAt,
      companyCount: sql<number>`count(${companies.id})::int`,
      notFoundCount: sql<number>`count(${companies.id}) filter (where ${companies.googleStatus} = 'not_found')::int`,
      foundCount: sql<number>`count(${companies.id}) filter (where ${companies.googleStatus} = 'found')::int`,
    })
    .from(exhibitions)
    .leftJoin(companies, eq(companies.exhibitionId, exhibitions.id))
    .groupBy(exhibitions.id)
    .orderBy(desc(exhibitions.createdAt));

  return NextResponse.json({ exhibitions: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "عنوان نمایشگاه الزامی است" }, { status: 400 });
  }

  const title: string = body.title.trim();
  const sourceUrl: string | null = typeof body.sourceUrl === "string" && body.sourceUrl.trim() ? body.sourceUrl.trim() : null;
  const year: string | null = typeof body.year === "string" && body.year.trim() ? body.year.trim() : null;
  const bulkText: string = typeof body.companiesText === "string" ? body.companiesText : "";

  const [exhibition] = await db
    .insert(exhibitions)
    .values({ title, sourceUrl, year })
    .returning();

  let insertedCount = 0;
  let skippedDuplicates: string[] = [];
  const parsed = parseCompaniesText(bulkText);
  if (parsed.length > 0) {
    // Brand-new exhibition, so the only duplicates possible are within the
    // pasted batch itself.
    const { toInsert, skipped } = dedupeCompanies(parsed, []);
    if (toInsert.length > 0) {
      // onConflictDoNothing is a safety net backed by the DB-level unique
      // index (exhibition_id, lower(name)) in case of a race condition;
      // the app-level dedupe above already handles the common case.
      const inserted = await db
        .insert(companies)
        .values(
          toInsert.map((c) => ({
            exhibitionId: exhibition.id,
            name: c.name,
            phone: c.phone ?? null,
            website: c.website ?? null,
            address: c.address ?? null,
            category: c.category ?? null,
            email: c.email ?? null,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: companies.id });
      insertedCount = inserted.length;
    } else {
      insertedCount = 0;
    }
    skippedDuplicates = skipped;
  }

  return NextResponse.json({ exhibition, insertedCount, skippedDuplicates }, { status: 201 });
}
