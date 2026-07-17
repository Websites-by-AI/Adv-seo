import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { count } from "drizzle-orm";
import { SEED_COMPANIES } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const existing = await db.select({ value: count() }).from(companies);
    const total = existing[0]?.value ?? 0;
    if (total > 0) {
      return NextResponse.json({ seeded: false, total });
    }
    await db.insert(companies).values(
      SEED_COMPANIES.map((c) => ({
        name: c.name,
        category: c.category,
        exhibition: c.exhibition,
        city: c.city,
        booth: c.booth,
        phone: c.phone,
        website: c.website,
        status: "pending",
      }))
    );
    return NextResponse.json({ seeded: true, total: SEED_COMPANIES.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطا در بارگذاری داده" },
      { status: 500 }
    );
  }
}
