import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseCompaniesText, dedupeCompanies, type ParsedCompany } from "@/lib/parse-companies";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const exhibitionId = Number(id);
  if (!Number.isInteger(exhibitionId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.exhibitionId, exhibitionId))
    .orderBy(desc(companies.priority), desc(companies.createdAt));

  return NextResponse.json({ companies: rows });
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const exhibitionId = Number(id);
  if (!Number.isInteger(exhibitionId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });
  }

  let rows: ParsedCompany[] = [];

  if (typeof body.companiesText === "string" && body.companiesText.trim()) {
    rows = parseCompaniesText(body.companiesText);
  } else if (typeof body.name === "string" && body.name.trim()) {
    rows = [
      {
        name: body.name.trim(),
        phone: body.phone || undefined,
        website: body.website || undefined,
        address: body.address || undefined,
        category: body.category || undefined,
        email: body.email || undefined,
      },
    ];
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "هیچ شرکتی برای افزودن یافت نشد" }, { status: 400 });
  }

  const existing = await db
    .select({ name: companies.name, phone: companies.phone })
    .from(companies)
    .where(eq(companies.exhibitionId, exhibitionId));

  const { toInsert, skipped } = dedupeCompanies(rows, existing);

  const inserted =
    toInsert.length > 0
      ? await db
          .insert(companies)
          .values(
            toInsert.map((c) => ({
              exhibitionId,
              name: c.name,
              phone: c.phone ?? null,
              website: c.website ?? null,
              address: c.address ?? null,
              category: c.category ?? null,
              email: c.email ?? null,
            })),
          )
          // Safety net backed by the DB-level unique index in case of a
          // race between two concurrent import requests.
          .onConflictDoNothing()
          .returning()
      : [];

  return NextResponse.json(
    { companies: inserted, insertedCount: inserted.length, skippedDuplicates: skipped },
    { status: 201 },
  );
}
