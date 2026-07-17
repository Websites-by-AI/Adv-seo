import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkCompanyOnGoogle } from "@/lib/google-places";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) {
    return NextResponse.json({ error: "شرکت یافت نشد" }, { status: 404 });
  }

  const check = await checkCompanyOnGoogle(company.name, company.address);

  if (check.status === "unknown") {
    // No API key configured (or lookup failed): keep status pending but
    // hand back a manual search link the user can verify with one click.
    const [updated] = await db
      .update(companies)
      .set({ googleMapsUrl: check.mapsUrl ?? null, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();

    return NextResponse.json({
      company: updated,
      requiresManualCheck: true,
      mapsUrl: check.mapsUrl,
    });
  }

  // Fixed assignment (not additive) so re-running the check on the same
  // company multiple times can't inflate its priority/rank indefinitely.
  const [updated] = await db
    .update(companies)
    .set({
      googleStatus: check.status,
      googlePlaceName: check.placeName ?? null,
      googleMapsUrl: check.mapsUrl ?? null,
      checkedAt: new Date(),
      priority: check.status === "not_found" ? 5 : 0,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId))
    .returning();

  return NextResponse.json({ company: updated, requiresManualCheck: false });
}
