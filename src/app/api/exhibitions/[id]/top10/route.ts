import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies, exhibitions, proposals } from "@/db/schema";
import { and, desc, eq, notInArray, inArray } from "drizzle-orm";
import { generateProposal } from "@/lib/proposal";
import { enhanceProposalWithAi } from "@/lib/ai-proposal";

type Params = { params: Promise<{ id: string }> };

// Selects up to the first 10 companies (from this exhibition) that are
// confirmed NOT present on Google Maps, and generates a tailored SEO /
// Google Business improvement proposal for each of them (skips ones that
// already have a proposal).
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const exhibitionId = Number(id);
  if (!Number.isInteger(exhibitionId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const [exhibition] = await db.select().from(exhibitions).where(eq(exhibitions.id, exhibitionId));
  if (!exhibition) {
    return NextResponse.json({ error: "نمایشگاه یافت نشد" }, { status: 404 });
  }

  // Companies in this exhibition that already have a proposal AND are
  // still marked "not_found". If a company's Google status later flips to
  // "found" (e.g. they fixed their profile themselves), it should no
  // longer occupy a slot in the "top 10 needing help" list.
  const existingProposalCompanyIds = (
    await db
      .select({ companyId: proposals.companyId })
      .from(proposals)
      .innerJoin(companies, eq(companies.id, proposals.companyId))
      .where(and(eq(companies.exhibitionId, exhibitionId), eq(companies.googleStatus, "not_found")))
  ).map((r) => r.companyId);

  const remainingSlots = Math.max(10 - existingProposalCompanyIds.length, 0);

  const whereClause =
    existingProposalCompanyIds.length > 0
      ? and(
          eq(companies.exhibitionId, exhibitionId),
          eq(companies.googleStatus, "not_found"),
          notInArray(companies.id, existingProposalCompanyIds),
        )
      : and(eq(companies.exhibitionId, exhibitionId), eq(companies.googleStatus, "not_found"));

  const candidates =
    remainingSlots > 0
      ? await db
          .select()
          .from(companies)
          .where(whereClause)
          .orderBy(desc(companies.priority), desc(companies.createdAt))
          .limit(remainingSlots)
      : [];

  const created: { companyId: number; name: string; proposalId: number }[] = [];

  for (const company of candidates) {
    const templateInput = {
      name: company.name,
      exhibitionTitle: exhibition.title,
      phone: company.phone,
      website: company.website,
      address: company.address,
      category: company.category,
    };
    const templateContent = generateProposal(templateInput);
    const { content, aiGenerated } = await enhanceProposalWithAi(templateContent, templateInput);

    const [proposal] = await db
      .insert(proposals)
      .values({ companyId: company.id, content, aiGenerated })
      .returning();

    created.push({ companyId: company.id, name: company.name, proposalId: proposal.id });
  }

  const top10CompanyIds = [...existingProposalCompanyIds, ...created.map((c) => c.companyId)].slice(0, 10);

  const top10Rows =
    top10CompanyIds.length > 0
      ? await db
          .select()
          .from(companies)
          .where(inArray(companies.id, top10CompanyIds))
      : [];

  // `inArray` does not guarantee result order matches the id list, so
  // re-sort explicitly (existing proposals first, then newly generated —
  // both already ordered by priority within their own group).
  const orderIndex = new Map(top10CompanyIds.map((id, i) => [id, i]));
  const top10 = top10Rows.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));

  return NextResponse.json({ generated: created.length, top10 });
}
