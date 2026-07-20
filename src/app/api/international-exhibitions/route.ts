import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, companies, exhibitions } from "@/db/schema";
import { normalizeUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ImportedCompany {
  name?: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  category?: string | null;
  booth?: string | null;
  country?: string | null;
  sourceUrl?: string | null;
}

interface ImportBody {
  event?: {
    name?: string;
    country?: string;
    city?: string;
    venue?: string;
    startDate?: string;
    endDate?: string;
    year?: string;
    sourceUrl?: string;
  };
  companies?: ImportedCompany[];
}

export async function GET() {
  const rows = await db
    .select({
      id: exhibitions.id,
      name: exhibitions.name,
      country: exhibitions.country,
      city: exhibitions.city,
      venue: exhibitions.venue,
      startDate: exhibitions.startDate,
      endDate: exhibitions.endDate,
      year: exhibitions.year,
      sourceUrl: exhibitions.sourceUrl,
      createdAt: exhibitions.createdAt,
      companiesCount: sql<number>`count(${companies.id})::int`,
    })
    .from(exhibitions)
    .leftJoin(companies, eq(companies.exhibitionId, exhibitions.id))
    .groupBy(exhibitions.id)
    .orderBy(desc(exhibitions.createdAt))
    .limit(100);

  return NextResponse.json({ exhibitions: rows });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ImportBody | null;
  const event = body?.event;
  const input = Array.isArray(body?.companies) ? body!.companies!.slice(0, 500) : [];

  if (!event?.name?.trim()) {
    return NextResponse.json({ error: "نام نمایشگاه الزامی است" }, { status: 400 });
  }
  if (input.length === 0) {
    return NextResponse.json({ error: "فهرست شرکت‌کنندگان خالی است" }, { status: 400 });
  }

  const normalized = input
    .map((company) => ({
      name: String(company.name ?? "").replace(/\s+/g, " ").trim().slice(0, 180),
      phone: company.phone ? String(company.phone).trim().slice(0, 80) : null,
      email: company.email ? String(company.email).trim().slice(0, 160) : null,
      website: company.website ? normalizeUrl(String(company.website)) : null,
      category: company.category ? String(company.category).trim().slice(0, 160) : null,
      booth: company.booth ? String(company.booth).trim().slice(0, 100) : null,
      country: company.country ? String(company.country).trim().slice(0, 100) : event.country?.trim() || null,
      sourceUrl: company.sourceUrl ? String(company.sourceUrl).trim().slice(0, 500) : event.sourceUrl?.trim() || null,
    }))
    .filter((company) => company.name.length >= 2);

  const seen = new Set<string>();
  const unique = normalized.filter((company) => {
    const key = company.name.toLocaleLowerCase("fa").replace(/[\s‌]+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const result = await db.transaction(async (tx) => {
    const [createdEvent] = await tx
      .insert(exhibitions)
      .values({
        name: event.name!.trim().slice(0, 220),
        sourceUrl: event.sourceUrl?.trim().slice(0, 500) || null,
        country: event.country?.trim().slice(0, 100) || "بین‌المللی",
        city: event.city?.trim().slice(0, 120) || null,
        venue: event.venue?.trim().slice(0, 220) || null,
        startDate: event.startDate?.trim().slice(0, 50) || null,
        endDate: event.endDate?.trim().slice(0, 50) || null,
        year: event.year?.trim().slice(0, 20) || null,
        isInternational: true,
      })
      .returning();

    const inserted = unique.length
      ? await tx
          .insert(companies)
          .values(
            unique.map((company) => ({
              exhibitionId: createdEvent.id,
              ...company,
              websiteStatus: company.website ? "provided" : "missing",
              opportunityScore: company.website ? 55 : 92,
              recommendedPackage: company.website
                ? "International SEO Audit"
                : "Website Launch + International SEO",
              status: "new",
            })),
          )
          .returning({ id: companies.id, name: companies.name })
      : [];

    await tx.insert(activityLogs).values({
      level: "success",
      message: `نمایشگاه بین‌المللی «${createdEvent.name}»: ${inserted.length} شرکت وارد شد`,
    });

    return { exhibition: createdEvent, inserted };
  });

  return NextResponse.json(
    {
      ok: true,
      exhibition: result.exhibition,
      inserted: result.inserted.length,
      skipped: input.length - result.inserted.length,
      companies: result.inserted,
    },
    { status: 201 },
  );
}
