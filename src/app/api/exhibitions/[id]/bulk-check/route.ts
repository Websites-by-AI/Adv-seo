import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { checkCompanyOnGoogle } from "@/lib/google-places";

type Params = { params: Promise<{ id: string }> };

// Cap the number of companies processed per invocation so a very large
// exhibitor list can't time out the request or blow through the Google
// Places API quota in one shot. The client re-calls this endpoint in a
// loop until `remaining` is 0.
const BATCH_SIZE = 25;

// Small delay between individual Google Places calls to stay comfortably
// under typical per-second quota limits (Google's default QPS caps are
// easy to hit when checking dozens of companies back-to-back).
const REQUEST_DELAY_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const exhibitionId = Number(id);
  if (!Number.isInteger(exhibitionId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const allPending = await db
    .select()
    .from(companies)
    .where(and(eq(companies.exhibitionId, exhibitionId), eq(companies.googleStatus, "not_checked")));

  const batch = allPending.slice(0, BATCH_SIZE);
  const results: { id: number; status: string }[] = [];
  const hasApiKey = Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY);

  for (let i = 0; i < batch.length; i++) {
    const company = batch[i];
    const check = await checkCompanyOnGoogle(company.name, company.address);
    const newStatus = check.status === "unknown" ? "not_checked" : check.status;

    await db
      .update(companies)
      .set({
        googleStatus: newStatus,
        googlePlaceName: check.placeName ?? null,
        googleMapsUrl: check.mapsUrl ?? null,
        checkedAt: check.status === "unknown" ? company.checkedAt : new Date(),
        // Fixed assignment (not additive) for consistency with the other
        // status-update endpoints — keeps priority idempotent.
        priority: newStatus === "not_found" ? 5 : newStatus === "found" ? 0 : company.priority,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company.id));

    results.push({ id: company.id, status: newStatus });

    if (hasApiKey && i < batch.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return NextResponse.json({
    checked: results.length,
    autoResolved: results.filter((r) => r.status !== "not_checked").length,
    remaining: Math.max(allPending.length - batch.length, 0),
    requiresApiKey: !process.env.GOOGLE_MAPS_API_KEY && !process.env.GOOGLE_PLACES_API_KEY,
    results,
  });
}
