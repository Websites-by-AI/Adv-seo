import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies, reports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { analyzeCompany } from "@/lib/analyzer";
import { getLeadById } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = Number((body as { id?: unknown }).id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
    }

    const row = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);
    const company = row[0];
    if (!company) {
      return NextResponse.json({ error: "شرکت یافت نشد" }, { status: 404 });
    }

    const data = await analyzeCompany({
      id: company.id,
      name: company.name,
      category: company.category,
      city: company.city,
      website: company.website,
    });

    await db
      .insert(reports)
      .values({
        companyId: company.id,
        seoScore: data.seoScore,
        googleRank: data.googleRank,
        onPageOne: data.onPageOne,
        loadMs: data.loadMs,
        dataSource: data.dataSource,
        rankSource: data.rankSource,
        opportunity: data.opportunity,
        keywordRanks: data.keywordRanks,
        keywords: data.keywords,
        checks: data.checks,
        issues: data.issues,
        actions: data.actions,
        design: data.design,
        roadmap: data.roadmap,
        analyzedAt: data.analyzedAt,
      })
      .onConflictDoUpdate({
        target: reports.companyId,
        set: {
          seoScore: data.seoScore,
          googleRank: data.googleRank,
          onPageOne: data.onPageOne,
          loadMs: data.loadMs,
          dataSource: data.dataSource,
          rankSource: data.rankSource,
          opportunity: data.opportunity,
          keywordRanks: data.keywordRanks,
          keywords: data.keywords,
          checks: data.checks,
          issues: data.issues,
          actions: data.actions,
          design: data.design,
          roadmap: data.roadmap,
          analyzedAt: data.analyzedAt,
        },
      });

    await db
      .update(companies)
      .set({ status: "analyzed" })
      .where(eq(companies.id, id));

    const fresh = await getLeadById(id);
    return NextResponse.json(fresh);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطا در تحلیل" },
      { status: 500 }
    );
  }
}
