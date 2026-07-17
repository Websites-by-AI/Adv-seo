import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

// Manual override used when no Google Places API key is configured: the
// user visits the Google Maps search link themselves and reports back
// whether the business was found.
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const found = body?.found;
  if (typeof found !== "boolean") {
    return NextResponse.json({ error: "مقدار found باید true یا false باشد" }, { status: 400 });
  }
  const mapsUrl: string | undefined = typeof body?.mapsUrl === "string" ? body.mapsUrl : undefined;

  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) {
    return NextResponse.json({ error: "شرکت یافت نشد" }, { status: 404 });
  }

  // `priority` is a stable "needs attention" flag (0 = ok, 5 = not found on
  // Google), not an accumulating counter. Using a fixed assignment instead
  // of `+= 5` keeps it idempotent no matter how many times a company is
  // re-checked/re-marked, so repeated clicks can't inflate its rank in the
  // Top-10 selection.
  const [updated] = await db
    .update(companies)
    .set({
      googleStatus: found ? "found" : "not_found",
      googleMapsUrl: mapsUrl ?? company.googleMapsUrl,
      checkedAt: new Date(),
      priority: found ? 0 : 5,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId))
    .returning();

  return NextResponse.json({ company: updated });
}
